import Capacitor

final class RvlryViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(RvlryDevicePlugin())
    }
}
