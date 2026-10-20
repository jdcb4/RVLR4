package au.joed.rvlry;

import android.view.WindowManager;
import androidx.lifecycle.Lifecycle;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

@CapacitorPlugin(name = "RvlryDevice")
public class RvlryDevicePlugin extends Plugin {
    private final ExecutorService storage = Executors.newSingleThreadExecutor();
    private SnapshotDatabase database;

    @Override
    public void load() {
        // Opening the database is deferred until the worker receives the first operation.
        database = new SnapshotDatabase(getContext().getApplicationContext());
    }

    @PluginMethod
    public void read(PluginCall call) {
        storage.execute(() -> {
            try {
                String[] snapshots = database.read(call.getString("key"));
                JSObject result = new JSObject();
                result.put("current", snapshots[0] == null ? JSONObject.NULL : snapshots[0]);
                result.put("previous", snapshots[1] == null ? JSONObject.NULL : snapshots[1]);
                call.resolve(result);
            } catch (IllegalArgumentException error) {
                call.reject(error.getMessage(), "INVALID_ARGUMENT");
            } catch (Exception error) {
                call.reject("Unable to read saved progress", "STORAGE_READ_FAILED");
            }
        });
    }

    @PluginMethod
    public void write(PluginCall call) {
        storage.execute(() -> {
            try {
                database.write(call.getString("key"), call.getString("value"));
                // SnapshotDatabase returns only after endTransaction has committed.
                call.resolve();
            } catch (IllegalArgumentException error) {
                call.reject(error.getMessage(), "INVALID_ARGUMENT");
            } catch (Exception error) {
                call.reject("Unable to save progress", "STORAGE_WRITE_FAILED");
            }
        });
    }

    @PluginMethod
    public void remove(PluginCall call) {
        storage.execute(() -> {
            try {
                database.remove(call.getString("key"));
                call.resolve();
            } catch (IllegalArgumentException error) {
                call.reject(error.getMessage(), "INVALID_ARGUMENT");
            } catch (Exception error) {
                call.reject("Unable to clear saved progress", "STORAGE_REMOVE_FAILED");
            }
        });
    }

    @PluginMethod
    public void setKeepAwake(PluginCall call) {
        setWindowFlag(call, WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @PluginMethod
    public void setPrivacy(PluginCall call) {
        setWindowFlag(call, WindowManager.LayoutParams.FLAG_SECURE);
    }

    private void setWindowFlag(PluginCall call, int flag) {
        Boolean enabled = call.getBoolean("enabled");
        if (enabled == null) {
            call.reject("enabled must be a boolean", "INVALID_ARGUMENT");
            return;
        }
        getActivity().runOnUiThread(() -> {
            if (enabled && (flag != WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON || getActivity().getLifecycle().getCurrentState().isAtLeast(Lifecycle.State.RESUMED))) {
                getActivity().getWindow().addFlags(flag);
            } else {
                getActivity().getWindow().clearFlags(flag);
            }
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        // Drain committed/queued saves, then close SQLite on its owning worker.
        storage.execute(() -> database.close());
        storage.shutdown();
    }
}
