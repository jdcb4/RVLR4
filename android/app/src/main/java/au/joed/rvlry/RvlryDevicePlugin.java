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
    private ContentDatabase contentDatabase;

    @Override
    public void load() {
        // Opening the database is deferred until the worker receives the first operation.
        database = new SnapshotDatabase(getContext().getApplicationContext());
        contentDatabase = new ContentDatabase(getContext().getApplicationContext());
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
    public void readContent(PluginCall call) {
        storage.execute(() -> {
            try {
                String[] content = contentDatabase.read(contentString(call, "kind", false));
                JSObject result = new JSObject();
                result.put("current", content[0] == null ? JSONObject.NULL : content[0]);
                result.put("previous", content[1] == null ? JSONObject.NULL : content[1]);
                call.resolve(result);
            } catch (IllegalArgumentException error) {
                call.reject(error.getMessage(), "INVALID_ARGUMENT");
            } catch (Exception error) {
                call.reject("Unable to read installed content", "CONTENT_READ_FAILED");
            }
        });
    }

    @PluginMethod
    public void installContent(PluginCall call) {
        storage.execute(() -> {
            try {
                String kind = contentString(call, "kind", false);
                String value = contentString(call, "value", false);
                String expectedCurrent = contentString(call, "expectedCurrent", true);
                if (call.getData().has("retainedPrevious")) {
                    contentDatabase.install(kind, value, expectedCurrent, contentString(call, "retainedPrevious", true));
                } else {
                    contentDatabase.install(kind, value, expectedCurrent);
                }
                call.resolve();
            } catch (ContentDatabase.ConflictException error) {
                call.reject(error.getMessage(), "CONTENT_CONFLICT");
            } catch (IllegalArgumentException error) {
                call.reject(error.getMessage(), "INVALID_ARGUMENT");
            } catch (Exception error) {
                call.reject("Unable to install content", "CONTENT_INSTALL_FAILED");
            }
        });
    }

    private String contentString(PluginCall call, String name, boolean nullable) {
        Object value = call.getData().opt(name);
        if (nullable && value == JSONObject.NULL) return null;
        if (!(value instanceof String)) {
            throw new IllegalArgumentException(name + (nullable ? " must be a string or null" : " must be a string"));
        }
        return (String) value;
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
        storage.execute(() -> {
            database.close();
            contentDatabase.close();
        });
        storage.shutdown();
    }
}
