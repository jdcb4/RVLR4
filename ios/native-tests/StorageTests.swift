import Foundation
import SQLite3
import Darwin

private enum TestFailure: Error { case failed(String) }

private func check(_ condition: @autoclosure () throws -> Bool, _ message: String) throws {
    guard try condition() else { throw TestFailure.failed(message) }
}

private func rejects(_ operation: () throws -> Void, matching predicate: (RvlryStorageError) -> Bool) throws {
    do { try operation() }
    catch let error as RvlryStorageError {
        try check(predicate(error), "Unexpected storage error")
        return
    }
    throw TestFailure.failed("Operation unexpectedly succeeded")
}

private let invalid: (RvlryStorageError) -> Bool = { if case .invalidArgument = $0 { return true }; return false }
private let failure: (RvlryStorageError) -> Bool = { if case .storageFailure = $0 { return true }; return false }
private let conflict: (RvlryStorageError) -> Bool = { if case .contentConflict = $0 { return true }; return false }

private func rawSQL(_ url: URL, _ sql: String) throws {
    var database: OpaquePointer?
    guard sqlite3_open(url.path, &database) == SQLITE_OK else { throw TestFailure.failed("Fixture open failed") }
    defer { sqlite3_close(database) }
    guard sqlite3_exec(database, sql, nil, nil, nil) == SQLITE_OK else { throw TestFailure.failed("Fixture SQL failed") }
}

private func pragma(_ url: URL, _ name: String) throws -> Int32 {
    var database: OpaquePointer?
    guard sqlite3_open(url.path, &database) == SQLITE_OK else { throw TestFailure.failed("Fixture open failed") }
    defer { sqlite3_close(database) }
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(database, "PRAGMA \(name)", -1, &statement, nil) == SQLITE_OK else { throw TestFailure.failed("Fixture prepare failed") }
    defer { sqlite3_finalize(statement) }
    guard sqlite3_step(statement) == SQLITE_ROW else { throw TestFailure.failed("Fixture query failed") }
    return sqlite3_column_int(statement, 0)
}

private func pack(_ version: Int, kind: String = "trivia", body: String = "test") -> String {
    "{\"schemaVersion\":1,\"kind\":\"\(kind)\",\"version\":\(version),\"body\":\"\(body)\"}"
}

private func snapshotTests(_ directory: URL) throws {
    let url = directory.appendingPathComponent("snapshots.db")
    var database: RvlrySnapshotDatabase? = try RvlrySnapshotDatabase(url: url)
    try check(try database!.read(key: "hat.device-session.v1").current == nil, "New store is empty")
    let original = "\u{0}secret 😀 e\u{301}"
    try database!.write(key: "hat.device-session.v1", value: original)
    try check(try database!.read(key: "hat.device-session.v1").previous == nil, "First write has no previous")
    try database!.write(key: "trivia.device.v3", value: "independent")
    try database!.write(key: "hat.device-session.v1", value: "second")
    let rotated = try database!.read(key: "hat.device-session.v1")
    try check(rotated.current == "second" && rotated.previous?.utf8.elementsEqual(original.utf8) == true, "Rotation preserves exact bytes")
    try check(try database!.read(key: "trivia.device.v3").current == "independent", "Game keys remain isolated")
    let maximum = String(repeating: "😀", count: RvlrySnapshotDatabase.maximumValueBytes / 4)
    try database!.write(key: "maximum", value: maximum)
    try database!.write(key: "maximum", value: maximum)
    try check(try database!.read(key: "maximum").previous?.utf8.count == 1_048_576, "Both maximum checkpoints readable")
    try rejects({ try database!.write(key: "maximum", value: maximum + "a") }, matching: invalid)
    for key in ["", "contains space", "é", String(repeating: "a", count: 129), "trailing\n"] {
        try rejects({ try database!.write(key: key, value: "value") }, matching: invalid)
    }
    try database!.write(key: String(repeating: "a", count: 128), value: "")
    try rawSQL(url, "CREATE TRIGGER fail_update BEFORE UPDATE ON snapshots BEGIN SELECT RAISE(ABORT, 'test'); END")
    try rejects({ try database!.write(key: "hat.device-session.v1", value: "must rollback") }, matching: failure)
    try rawSQL(url, "DROP TRIGGER fail_update")
    try check(try database!.read(key: "hat.device-session.v1").current == "second", "Failed save retains current")
    try check(try database!.read(key: "hat.device-session.v1").previous?.utf8.elementsEqual(original.utf8) == true, "Failed save retains previous")
    try database!.remove(key: "hat.device-session.v1")
    database = nil
    let reopened = try RvlrySnapshotDatabase(url: url)
    try check(try reopened.read(key: "hat.device-session.v1").current == nil, "Removal survives reopen")
    try check(try reopened.read(key: "trivia.device.v3").current == "independent", "Commit survives reopen")
    try check(try pragma(url, "user_version") == 1, "Schema version recorded")

    let future = directory.appendingPathComponent("future.db")
    try rawSQL(future, "PRAGMA user_version=2")
    try rejects({ _ = try RvlrySnapshotDatabase(url: future) }, matching: failure)
    try check(try pragma(future, "user_version") == 2, "Unsupported database left intact")
}

private func contentTests(_ directory: URL) throws {
    let url = directory.appendingPathComponent("content.db")
    var database: RvlryContentDatabase? = try RvlryContentDatabase(url: url)
    let first = pack(1)
    let second = pack(2)
    let third = pack(3)
    try database!.install(kind: "trivia", value: first, expectedCurrent: nil)
    try database!.install(kind: "trivia", value: second, expectedCurrent: first)
    try rejects({ try database!.install(kind: "trivia", value: third, expectedCurrent: first) }, matching: conflict)
    try rejects({ try database!.install(kind: "trivia", value: second, expectedCurrent: second) }, matching: invalid)
    try rejects({ try database!.install(kind: "trivia", value: third, expectedCurrent: second, retainedPrevious: "forged", retentionSupplied: true) }, matching: invalid)
    try database!.install(kind: "trivia", value: third, expectedCurrent: second, retainedPrevious: first, retentionSupplied: true)
    try check(try database!.read(kind: "trivia").previous == first, "Validated previous retained")
    // Simulate a bad current envelope while keeping a previously validated checkpoint.
    try rawSQL(url, "DELETE FROM content_chunks WHERE kind='trivia' AND slot=0; INSERT INTO content_chunks VALUES('trivia', 0, 0, X'62726F6B656E')")
    try database!.install(kind: "trivia", value: pack(4), expectedCurrent: "broken", retainedPrevious: first, retentionSupplied: true)
    try check(try database!.read(kind: "trivia").previous == first, "Corrupt-current recovery retains valid previous")
    try database!.install(kind: "words", value: pack(1, kind: "words"), expectedCurrent: nil)
    try rawSQL(url, "CREATE TRIGGER fail_insert BEFORE INSERT ON content_chunks WHEN NEW.kind='trivia' AND NEW.chunk_index=1 BEGIN SELECT RAISE(ABORT, 'test'); END")
    try rejects({ try database!.install(kind: "trivia", value: pack(5, body: String(repeating: "x", count: 300_000)), expectedCurrent: pack(4)) }, matching: failure)
    try rawSQL(url, "DROP TRIGGER fail_insert")
    try check(try database!.read(kind: "trivia").current == pack(4), "Partial content install rolls back current")
    try check(try database!.read(kind: "trivia").previous == first, "Partial content install rolls back previous")
    try check(try database!.read(kind: "words").current == pack(1, kind: "words"), "Content kinds remain isolated")
    let headerSize = pack(5, body: "").utf8.count
    let maximum = pack(5, body: String(repeating: "x", count: RvlryContentDatabase.maximumValueBytes - headerSize))
    try database!.install(kind: "trivia", value: maximum, expectedCurrent: pack(4))
    let secondMaximum = maximum.replacingOccurrences(of: "\"version\":5", with: "\"version\":6")
    try database!.install(kind: "trivia", value: secondMaximum, expectedCurrent: maximum)
    try check(try database!.read(kind: "trivia").previous?.utf8.count == 8_388_608, "Both 8 MiB chunked packs readable")
    try rejects({ try database!.install(kind: "trivia", value: maximum + " ", expectedCurrent: secondMaximum) }, matching: invalid)
    database = nil
    let reopened = try RvlryContentDatabase(url: url)
    try check(try reopened.read(kind: "trivia").current?.utf8.elementsEqual(secondMaximum.utf8) == true, "Maximum content survives reopen")
    try reopened.install(kind: "trivia", value: pack(7), expectedCurrent: secondMaximum, retainedPrevious: nil, retentionSupplied: true)
    try check(try reopened.read(kind: "trivia").previous == nil, "Explicit null discards previous")
    // Swift canonical-equivalence must not allow a stale but differently encoded CAS value.
    let composed = pack(8, body: "é")
    let decomposed = pack(8, body: "e\u{301}")
    try reopened.install(kind: "trivia", value: composed, expectedCurrent: pack(7))
    try rejects({ try reopened.install(kind: "trivia", value: pack(9), expectedCurrent: decomposed) }, matching: conflict)
    let competing = try RvlryContentDatabase(url: url)
    try competing.install(kind: "trivia", value: pack(9), expectedCurrent: composed)
    try rejects({ try reopened.install(kind: "trivia", value: pack(10), expectedCurrent: composed) }, matching: conflict)
    try check(try reopened.read(kind: "trivia").current == pack(9), "Stale connection cannot overwrite newer installation")
    for envelope in [
        "{}", "[]", "broken", "{\"schemaVersion\":true,\"kind\":\"trivia\",\"version\":1}",
        "{\"schemaVersion\":1,\"kind\":\"trivia\",\"version\":true}",
        "{\"schemaVersion\":1,\"kind\":\"trivia\",\"version\":1.5}",
        "{\"schemaVersion\":1,\"kind\":\"trivia\",\"version\":9007199254740992}",
        pack(0), pack(1, kind: "words")
    ] {
        try rejects({ _ = try RvlryContentDatabase.validateHeader(kind: "trivia", value: envelope) }, matching: invalid)
    }
    try check(try RvlryContentDatabase.validateHeader(kind: "trivia", value: pack(9_007_199_254_740_991)) == 9_007_199_254_740_991, "Largest JavaScript safe version accepted")
    try rawSQL(url, "UPDATE content_chunks SET chunk_index=2 WHERE kind='words' AND slot=0")
    try rejects({ _ = try reopened.read(kind: "words") }, matching: failure)
}

private func abruptExitTests(_ directory: URL) throws {
    let child = Process()
    child.executableURL = URL(fileURLWithPath: CommandLine.arguments[0])
    child.arguments = ["--seed-and-exit", directory.path]
    try child.run()
    child.waitUntilExit()
    try check(child.terminationStatus == 0, "Abrupt writer completed")
    let snapshots = try RvlrySnapshotDatabase(url: directory.appendingPathComponent("abrupt-snapshots.db"))
    let saved = try snapshots.read(key: "hat.device-session.v1")
    try check(saved.current == "committed" && saved.previous == "first", "Acknowledged saves survive process exit without close")
    let content = try RvlryContentDatabase(url: directory.appendingPathComponent("abrupt-content.db"))
    let installed = try content.read(kind: "trivia")
    try check(installed.current == pack(2) && installed.previous == pack(1), "Content survives process exit without close")
}

@main
private enum StorageTests {
    static func main() throws {
        if CommandLine.arguments.count == 3 && CommandLine.arguments[1] == "--seed-and-exit" {
            let directory = URL(fileURLWithPath: CommandLine.arguments[2])
            let snapshots = try RvlrySnapshotDatabase(url: directory.appendingPathComponent("abrupt-snapshots.db"))
            try snapshots.write(key: "hat.device-session.v1", value: "first")
            try snapshots.write(key: "hat.device-session.v1", value: "committed")
            let content = try RvlryContentDatabase(url: directory.appendingPathComponent("abrupt-content.db"))
            try content.install(kind: "trivia", value: pack(1), expectedCurrent: nil)
            try content.install(kind: "trivia", value: pack(2), expectedCurrent: pack(1))
            // Prevent ARC's optimizer from closing the databases after their last use.
            withExtendedLifetime((snapshots, content)) { _exit(0) }
        }
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("rvlry-native-tests-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        try snapshotTests(directory)
        try contentTests(directory)
        try abruptExitTests(directory)
        print("RVLRY native SQLite tests passed (rotation, rollback, UTF-8 limits, CAS, retention, reopen and abrupt process exit).")
    }
}
