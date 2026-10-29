import Capacitor
import CoreFoundation
import Foundation
import UIKit

@objc(RvlryDevicePlugin)
public final class RvlryDevicePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RvlryDevicePlugin"
    public let jsName = "RvlryDevice"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "write", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readContent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "installContent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setKeepAwake", returnType: CAPPluginReturnPromise)
    ]

    private let storage = DispatchQueue(label: "au.joed.rvlry.storage", qos: .userInitiated)
    private var snapshots: RvlrySnapshotDatabase?
    private var content: RvlryContentDatabase?
    private var lifecycleObservers: [NSObjectProtocol] = []

    public override func load() {
        for name in [UIApplication.willResignActiveNotification, UIApplication.didEnterBackgroundNotification] {
            lifecycleObservers.append(NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { _ in
                UIApplication.shared.isIdleTimerDisabled = false
            })
        }
    }

    deinit {
        lifecycleObservers.forEach(NotificationCenter.default.removeObserver)
        DispatchQueue.main.async { UIApplication.shared.isIdleTimerDisabled = false }
        // Submitted operations retain the plugin until their COMMIT and bridge acknowledgement finish.
    }

    private func databaseURL(_ name: String) throws -> URL {
        let manager = FileManager.default
        var directory = try manager.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            .appendingPathComponent("RVLRY", isDirectory: true)
        try manager.createDirectory(at: directory, withIntermediateDirectories: true, attributes: [
            .protectionKey: FileProtectionType.completeUntilFirstUserAuthentication
        ])
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try directory.setResourceValues(values)
        return directory.appendingPathComponent(name)
    }

    private func snapshotDatabase() throws -> RvlrySnapshotDatabase {
        if let snapshots = snapshots { return snapshots }
        let opened = try RvlrySnapshotDatabase(url: databaseURL("rvlry-snapshots.db"))
        snapshots = opened
        return opened
    }

    private func contentDatabase() throws -> RvlryContentDatabase {
        if let content = content { return content }
        let opened = try RvlryContentDatabase(url: databaseURL("rvlry-content.db"))
        content = opened
        return opened
    }

    private func requiredString(_ call: CAPPluginCall, _ name: String) throws -> String {
        guard let value = call.getString(name) else { throw RvlryStorageError.invalidArgument("\(name) must be a string") }
        return value
    }

    private func nullableString(_ call: CAPPluginCall, _ name: String) throws -> String? {
        if call.options[name] is NSNull { return nil }
        guard let value = call.getString(name) else { throw RvlryStorageError.invalidArgument("\(name) must be a string or null") }
        return value
    }

    private func result(_ pair: RvlryCheckpointPair) -> PluginCallResultData {
        ["current": pair.current.map { $0 as Any } ?? NSNull(), "previous": pair.previous.map { $0 as Any } ?? NSNull()]
    }

    private func perform(_ call: CAPPluginCall, code: String, message: String, operation: @escaping () throws -> PluginCallResultData) {
        storage.async {
            do { call.resolve(try operation()) }
            catch RvlryStorageError.invalidArgument(let reason) { call.reject(reason, "INVALID_ARGUMENT") }
            catch RvlryStorageError.contentConflict { call.reject("Installed content changed; reload before installing", "CONTENT_CONFLICT") }
            catch { call.reject(message, code) }
        }
    }

    @objc public func read(_ call: CAPPluginCall) {
        perform(call, code: "STORAGE_READ_FAILED", message: "Unable to read saved progress") {
            try self.result(self.snapshotDatabase().read(key: self.requiredString(call, "key")))
        }
    }

    @objc public func write(_ call: CAPPluginCall) {
        perform(call, code: "STORAGE_WRITE_FAILED", message: "Unable to save progress") {
            try self.snapshotDatabase().write(key: self.requiredString(call, "key"), value: self.requiredString(call, "value"))
            return [:]
        }
    }

    @objc public func remove(_ call: CAPPluginCall) {
        perform(call, code: "STORAGE_REMOVE_FAILED", message: "Unable to clear saved progress") {
            try self.snapshotDatabase().remove(key: self.requiredString(call, "key"))
            return [:]
        }
    }

    @objc public func readContent(_ call: CAPPluginCall) {
        perform(call, code: "CONTENT_READ_FAILED", message: "Unable to read installed content") {
            try self.result(self.contentDatabase().read(kind: self.requiredString(call, "kind")))
        }
    }

    @objc public func installContent(_ call: CAPPluginCall) {
        perform(call, code: "CONTENT_INSTALL_FAILED", message: "Unable to install content") {
            let retainedPresent = call.options["retainedPrevious"] != nil
            try self.contentDatabase().install(
                kind: self.requiredString(call, "kind"), value: self.requiredString(call, "value"),
                expectedCurrent: self.nullableString(call, "expectedCurrent"),
                retainedPrevious: retainedPresent ? self.nullableString(call, "retainedPrevious") : nil,
                retentionSupplied: retainedPresent
            )
            return [:]
        }
    }

    @objc public func setKeepAwake(_ call: CAPPluginCall) {
        // NSNumber bridges numeric 0/1 to Bool, so reject those rather than accepting non-boolean JS values.
        guard let enabled = call.options["enabled"] as? NSNumber, CFGetTypeID(enabled) == CFBooleanGetTypeID() else {
            call.reject("enabled must be a boolean", "INVALID_ARGUMENT")
            return
        }
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = enabled.boolValue && UIApplication.shared.applicationState == .active
            call.resolve()
        }
    }
}
