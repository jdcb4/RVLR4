package au.joed.rvlry;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RvlryDevicePlugin.class);
        // Screenshots and recent-app previews are allowed throughout the app.
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onPause() {
        // Release even when JavaScript is blocked or has not handled the event yet.
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        super.onPause();
    }
}
