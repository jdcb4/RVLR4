import Foundation
import CoreFoundation
import SQLite3

enum RvlryStorageError: Error {
    case invalidArgument(String)
    case contentConflict
    case storageFailure
}

struct RvlryCheckpointPair {
    let current: String?
    let previous: String?
}

// SQLite owns copies of bound values. Never include SQL errors or private data in bridge errors.
private let sqliteTransient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

private enum SQLiteValue {
    case text(String)
    case integer(Int)
    case blob(Data)
}

private final class RvlrySQLite {
    private var handle: OpaquePointer?

    init(url: URL, schema: String) throws {
        var opened: OpaquePointer?
        guard sqlite3_open_v2(url.path, &opened, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX, nil) == SQLITE_OK else {
            if let opened = opened { sqlite3_close(opened) }
            throw RvlryStorageError.storageFailure
        }
        handle = opened
        do {
            guard sqlite3_busy_timeout(opened, 5_000) == SQLITE_OK else { throw RvlryStorageError.storageFailure }
            try execute("PRAGMA journal_mode=DELETE")
            try execute("PRAGMA synchronous=FULL")
            // On Apple platforms FULLFSYNC also flushes the device write cache before acknowledgement.
            try execute("PRAGMA fullfsync=ON")
            try transaction {
                let version = try scalarInteger("PRAGMA user_version")
                guard version == 0 || version == 1 else { throw RvlryStorageError.storageFailure }
                if version == 0 {
                    try execute(schema)
                    try execute("PRAGMA user_version=1")
                }
            }
        } catch {
            sqlite3_close(handle)
            handle = nil
            throw error
        }
    }

    deinit { sqlite3_close(handle) }

    func transaction<T>(_ operation: () throws -> T) throws -> T {
        try execute("BEGIN IMMEDIATE TRANSACTION")
        do {
            let result = try operation()
            try execute("COMMIT")
            return result
        } catch {
            try? execute("ROLLBACK")
            throw error
        }
    }

    func statement<T>(_ sql: String, _ values: [SQLiteValue] = [], _ operation: (OpaquePointer) throws -> T) throws -> T {
        var prepared: OpaquePointer?
        guard sqlite3_prepare_v2(handle, sql, -1, &prepared, nil) == SQLITE_OK, let prepared = prepared else {
            throw RvlryStorageError.storageFailure
        }
        defer { sqlite3_finalize(prepared) }
        for (offset, value) in values.enumerated() {
            let index = Int32(offset + 1)
            let result: Int32
            switch value {
            case .text(let text):
                result = text.withCString { sqlite3_bind_text(prepared, index, $0, Int32(text.utf8.count), sqliteTransient) }
            case .integer(let number):
                result = sqlite3_bind_int64(prepared, index, sqlite3_int64(number))
            case .blob(let data):
                result = data.withUnsafeBytes { sqlite3_bind_blob(prepared, index, $0.baseAddress, Int32(data.count), sqliteTransient) }
            }
            guard result == SQLITE_OK else { throw RvlryStorageError.storageFailure }
        }
        return try operation(prepared)
    }

    func execute(_ sql: String, _ values: [SQLiteValue] = []) throws {
        try statement(sql, values) { prepared in
            // Some PRAGMAs return a row; consume it before finalizing.
            var result = sqlite3_step(prepared)
            while result == SQLITE_ROW { result = sqlite3_step(prepared) }
            guard result == SQLITE_DONE else { throw RvlryStorageError.storageFailure }
        }
    }

    func scalarInteger(_ sql: String) throws -> Int64 {
        try statement(sql) { prepared in
            guard sqlite3_step(prepared) == SQLITE_ROW else { throw RvlryStorageError.storageFailure }
            return sqlite3_column_int64(prepared, 0)
        }
    }

    var changes: Int32 { sqlite3_changes(handle) }

    static func text(_ prepared: OpaquePointer, _ column: Int32) throws -> String? {
        guard sqlite3_column_type(prepared, column) != SQLITE_NULL else { return nil }
        let length = Int(sqlite3_column_bytes(prepared, column))
        guard let bytes = sqlite3_column_text(prepared, column),
              let value = String(bytes: UnsafeBufferPointer(start: bytes, count: length), encoding: .utf8) else {
            throw RvlryStorageError.storageFailure
        }
        return value
    }
}

// Each instance is owned by the plugin's single storage queue; no SQLite work runs on the UI thread.
final class RvlrySnapshotDatabase {
    static let maximumValueBytes = 1024 * 1024
    private let database: RvlrySQLite

    init(url: URL) throws {
        database = try RvlrySQLite(url: url, schema: "CREATE TABLE snapshots (snapshot_key TEXT PRIMARY KEY NOT NULL, current TEXT NOT NULL, previous TEXT)")
    }

    static func validateKey(_ key: String) throws {
        let bytes = Array(key.utf8)
        guard (1...128).contains(bytes.count), bytes.allSatisfy({
            (65...90).contains($0) || (97...122).contains($0) || (48...57).contains($0) || [46, 95, 58, 45].contains($0)
        }) else {
            throw RvlryStorageError.invalidArgument("Snapshot key must contain 1–128 ASCII letters, digits, dots, underscores, colons or hyphens")
        }
    }

    func read(key: String) throws -> RvlryCheckpointPair {
        try Self.validateKey(key)
        return try database.transaction {
            try database.statement("SELECT current, previous FROM snapshots WHERE snapshot_key = ?", [.text(key)]) { prepared in
                switch sqlite3_step(prepared) {
                case SQLITE_DONE: return RvlryCheckpointPair(current: nil, previous: nil)
                case SQLITE_ROW:
                    return try RvlryCheckpointPair(current: RvlrySQLite.text(prepared, 0), previous: RvlrySQLite.text(prepared, 1))
                default: throw RvlryStorageError.storageFailure
                }
            }
        }
    }

    func write(key: String, value: String) throws {
        try Self.validateKey(key)
        guard value.utf8.count <= Self.maximumValueBytes else {
            throw RvlryStorageError.invalidArgument("Snapshot value must be a string of at most 1 MiB UTF-8")
        }
        try database.transaction {
            try database.execute("INSERT OR IGNORE INTO snapshots(snapshot_key, current, previous) VALUES (?, ?, NULL)", [.text(key), .text(value)])
            if database.changes == 0 {
                try database.execute("UPDATE snapshots SET previous = current, current = ? WHERE snapshot_key = ?", [.text(value), .text(key)])
            }
        }
    }

    func remove(key: String) throws {
        try Self.validateKey(key)
        try database.transaction {
            try database.execute("DELETE FROM snapshots WHERE snapshot_key = ?", [.text(key)])
        }
    }
}

final class RvlryContentDatabase {
    static let maximumValueBytes = 8 * 1024 * 1024
    static let chunkBytes = 256 * 1024
    private let database: RvlrySQLite

    init(url: URL) throws {
        database = try RvlrySQLite(url: url, schema: "CREATE TABLE content_chunks (kind TEXT NOT NULL, slot INTEGER NOT NULL CHECK(slot IN (0, 1)), chunk_index INTEGER NOT NULL, value BLOB NOT NULL, PRIMARY KEY(kind, slot, chunk_index))")
    }

    static func validateKind(_ kind: String) throws {
        guard kind == "trivia" || kind == "words" else { throw RvlryStorageError.invalidArgument("Content kind must be trivia or words") }
    }

    private static func boundedBytes(_ value: String) throws -> Data {
        guard value.utf8.count <= maximumValueBytes else {
            throw RvlryStorageError.invalidArgument("Content value must be a string of at most 8 MiB UTF-8")
        }
        return Data(value.utf8)
    }

    static func validateHeader(kind: String, value: String) throws -> Int64 {
        try validateKind(kind)
        let bytes = try boundedBytes(value)
        guard let object = try? JSONSerialization.jsonObject(with: bytes), let header = object as? [String: Any] else {
            throw RvlryStorageError.invalidArgument("Content must have a valid JSON envelope")
        }
        guard safeInteger(header["schemaVersion"]) == 1, header["kind"] as? String == kind else {
            throw RvlryStorageError.invalidArgument("Unsupported content envelope")
        }
        guard let version = safeInteger(header["version"]), version >= 1 else {
            throw RvlryStorageError.invalidArgument("Content version must be a positive safe integer")
        }
        return version
    }

    private static func safeInteger(_ value: Any?) -> Int64? {
        guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID() else { return nil }
        let numeric = number.doubleValue
        guard numeric.isFinite, numeric >= 0, numeric <= 9_007_199_254_740_991, numeric.rounded(.down) == numeric else { return nil }
        return number.int64Value
    }

    private static func knownVersion(kind: String, value: String?) -> Int64 {
        guard let value = value else { return 0 }
        return (try? validateHeader(kind: kind, value: value)) ?? 0
    }

    // Swift String equality normalizes Unicode; bridge compare-and-swap must compare exact UTF-8 bytes.
    private static func identical(_ left: String?, _ right: String?) -> Bool {
        switch (left, right) {
        case (nil, nil): return true
        case (.some(let left), .some(let right)): return left.utf8.elementsEqual(right.utf8)
        default: return false
        }
    }

    func read(kind: String) throws -> RvlryCheckpointPair {
        try Self.validateKind(kind)
        return try database.transaction { try readSlots(kind: kind) }
    }

    private func readSlots(kind: String) throws -> RvlryCheckpointPair {
        try RvlryCheckpointPair(current: readSlot(kind: kind, slot: 0), previous: readSlot(kind: kind, slot: 1))
    }

    private func readSlot(kind: String, slot: Int) throws -> String? {
        try database.statement("SELECT chunk_index, value FROM content_chunks WHERE kind = ? AND slot = ? ORDER BY chunk_index ASC", [.text(kind), .integer(slot)]) { prepared in
            var bytes = Data()
            var index: Int64 = 0
            var result = sqlite3_step(prepared)
            while result == SQLITE_ROW {
                let length = Int(sqlite3_column_bytes(prepared, 1))
                guard sqlite3_column_int64(prepared, 0) == index, length > 0, length <= Self.chunkBytes,
                      bytes.count + length <= Self.maximumValueBytes, let chunk = sqlite3_column_blob(prepared, 1) else {
                    throw RvlryStorageError.storageFailure
                }
                bytes.append(chunk.assumingMemoryBound(to: UInt8.self), count: length)
                index += 1
                result = sqlite3_step(prepared)
            }
            guard result == SQLITE_DONE else { throw RvlryStorageError.storageFailure }
            if index == 0 { return nil }
            guard let value = String(data: bytes, encoding: .utf8) else { throw RvlryStorageError.storageFailure }
            return value
        }
    }

    func install(kind: String, value: String, expectedCurrent: String?, retainedPrevious: String? = nil, retentionSupplied: Bool = false) throws {
        let version = try Self.validateHeader(kind: kind, value: value)
        let bytes = try Self.boundedBytes(value)
        if let expectedCurrent = expectedCurrent { _ = try Self.boundedBytes(expectedCurrent) }
        if let retainedPrevious = retainedPrevious { _ = try Self.boundedBytes(retainedPrevious) }
        try database.transaction {
            let installed = try readSlots(kind: kind)
            guard Self.identical(expectedCurrent, installed.current) else { throw RvlryStorageError.contentConflict }
            let previous = retentionSupplied ? retainedPrevious : installed.current
            guard previous == nil || Self.identical(previous, installed.current) || Self.identical(previous, installed.previous) else {
                throw RvlryStorageError.invalidArgument("Retained content must match an installed checkpoint")
            }
            guard version > max(Self.knownVersion(kind: kind, value: installed.current), Self.knownVersion(kind: kind, value: installed.previous)) else {
                throw RvlryStorageError.invalidArgument("Content version must increase")
            }
            try database.execute("DELETE FROM content_chunks WHERE kind = ?", [.text(kind)])
            try writeSlot(kind: kind, slot: 0, bytes: bytes)
            if let previous = previous { try writeSlot(kind: kind, slot: 1, bytes: Self.boundedBytes(previous)) }
        }
    }

    private func writeSlot(kind: String, slot: Int, bytes: Data) throws {
        for offset in stride(from: 0, to: bytes.count, by: Self.chunkBytes) {
            let chunk = bytes.subdata(in: offset..<min(offset + Self.chunkBytes, bytes.count))
            try database.execute("INSERT INTO content_chunks(kind, slot, chunk_index, value) VALUES (?, ?, ?, ?)", [.text(kind), .integer(slot), .integer(offset / Self.chunkBytes), .blob(chunk)])
        }
    }
}
