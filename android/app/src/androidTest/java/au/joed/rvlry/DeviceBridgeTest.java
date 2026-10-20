package au.joed.rvlry;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.view.WindowManager;
import androidx.lifecycle.Lifecycle;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class DeviceBridgeTest {
    private String evaluate(MainActivity activity, String javascript) throws Exception {
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch completed = new CountDownLatch(1);
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> activity.getBridge().getWebView().evaluateJavascript(javascript, value -> {
            result.set(value);
            completed.countDown();
        }));
        assertTrue("WebView evaluation timed out", completed.await(10, TimeUnit.SECONDS));
        return result.get();
    }

    private String awaitBridgeResult(MainActivity activity) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
        String result;
        do {
            result = evaluate(activity, "window.__rvlryNativeTestResult");
            if (!"\"pending\"".equals(result)) {
                return result;
            }
            Thread.sleep(50);
        } while (System.nanoTime() < deadline);
        throw new AssertionError("Native bridge request timed out");
    }

    @Test
    public void registeredBridgeCommitsReadsAndClearsSnapshotsAndReleasesWakeFlag() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            AtomicReference<MainActivity> activityRef = new AtomicReference<>();
            scenario.onActivity(activityRef::set);
            MainActivity activity = activityRef.get();
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(20);
            while (!"true".equals(evaluate(activity, "typeof window.Capacitor?.nativePromise === 'function'"))) {
                assertTrue("Capacitor bridge did not initialize", System.nanoTime() < deadline);
                Thread.sleep(50);
            }
            scenario.onActivity(current -> assertTrue((current.getWindow().getAttributes().flags & WindowManager.LayoutParams.FLAG_SECURE) != 0));
            evaluate(activity, "window.__rvlryNativeTestResult='pending';(async()=>{const call=(m,o)=>window.Capacitor.nativePromise('RvlryDevice',m,o);await call('remove',{key:'native-smoke'});await call('write',{key:'native-smoke',value:'first'});await call('write',{key:'native-smoke',value:'second'});const saved=await call('read',{key:'native-smoke'});if(saved.current!=='second'||saved.previous!=='first')throw Error('rotation');await call('remove',{key:'native-smoke'});const cleared=await call('read',{key:'native-smoke'});if(cleared.current!==null||cleared.previous!==null)throw Error('remove');await call('setPrivacy',{enabled:false});await call('setPrivacy',{enabled:true});await call('setKeepAwake',{enabled:true});window.__rvlryNativeTestResult='ok';})().catch(()=>window.__rvlryNativeTestResult='failed');");
            assertEquals("\"ok\"", awaitBridgeResult(activity));
            scenario.onActivity(current -> assertTrue((current.getWindow().getAttributes().flags & WindowManager.LayoutParams.FLAG_SECURE) != 0));
            scenario.onActivity(current -> assertTrue((current.getWindow().getAttributes().flags & WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) != 0));
            scenario.moveToState(Lifecycle.State.CREATED);
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> assertEquals(0, activity.getWindow().getAttributes().flags & WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));
        }
    }
}
