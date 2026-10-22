package au.joed.rvlry;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.lang.reflect.Field;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class ContentBridgeTest {
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

    @Test
    public void bridgePreservesRawPacksAndRejectsInvalidOrStaleRequests() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        String name = "content-bridge-test.db";
        context.deleteDatabase(name);
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            AtomicReference<MainActivity> activityRef = new AtomicReference<>();
            scenario.onActivity(activityRef::set);
            MainActivity activity = activityRef.get();
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(20);
            while (!"true".equals(evaluate(activity, "typeof window.Capacitor?.nativePromise === 'function'"))) {
                assertTrue("Capacitor bridge did not initialize", System.nanoTime() < deadline);
                Thread.sleep(50);
            }
            RvlryDevicePlugin plugin = (RvlryDevicePlugin) activity.getBridge().getPlugin("RvlryDevice").getInstance();
            Field databaseField = RvlryDevicePlugin.class.getDeclaredField("contentDatabase");
            databaseField.setAccessible(true);
            Field workerField = RvlryDevicePlugin.class.getDeclaredField("storage");
            workerField.setAccessible(true);
            ExecutorService worker = (ExecutorService) workerField.get(plugin);
            ContentDatabase original = (ContentDatabase) databaseField.get(plugin);
            ContentDatabase disposable = new ContentDatabase(context, name);
            worker.submit(() -> {
                try {
                    databaseField.set(plugin, disposable);
                } catch (IllegalAccessException error) {
                    throw new IllegalStateException(error);
                }
            }).get(10, TimeUnit.SECONDS);
            try {
                evaluate(activity, """
                    window.__rvlryContentTestResult='pending';
                    (async()=>{
                      const call=(m,o)=>window.Capacitor.nativePromise('RvlryDevice',m,o);
                      const assert=(condition)=>{if(!condition)throw Error('assertion');};
                      const reject=async(o,code)=>{
                        try { await call('installContent',o); } catch(error) { assert(error.code===code); return; }
                        throw Error('expected rejection');
                      };
                      const first=JSON.stringify({schemaVersion:1,kind:'trivia',version:1,entries:[]});
                      const second=JSON.stringify({schemaVersion:1,kind:'trivia',version:2,entries:[]});
                      let saved=await call('readContent',{kind:'trivia'});
                      assert(saved.current===null&&saved.previous===null);
                      await reject({kind:'trivia',value:first},'INVALID_ARGUMENT');
                      await reject({kind:'trivia',value:{},expectedCurrent:null},'INVALID_ARGUMENT');
                      await call('installContent',{kind:'trivia',value:first,expectedCurrent:null});
                      await reject({kind:'trivia',value:second,expectedCurrent:null},'CONTENT_CONFLICT');
                      await call('installContent',{kind:'trivia',value:second,expectedCurrent:first,retainedPrevious:first});
                      saved=await call('readContent',{kind:'trivia'});
                      assert(saved.current===second&&saved.previous===first);
                      await reject({kind:'trivia',value:first,expectedCurrent:second},'INVALID_ARGUMENT');
                      const words=await call('readContent',{kind:'words'});
                      assert(words.current===null&&words.previous===null);
                      window.__rvlryContentTestResult='ok';
                    })().catch(error=>window.__rvlryContentTestResult=error.message);
                    """);
                String result;
                deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(20);
                do {
                    result = evaluate(activity, "window.__rvlryContentTestResult");
                    if (!"\"pending\"".equals(result)) break;
                    Thread.sleep(50);
                } while (System.nanoTime() < deadline);
                assertEquals("\"ok\"", result);
            } finally {
                worker.submit(() -> {
                    try {
                        databaseField.set(plugin, original);
                        disposable.close();
                    } catch (IllegalAccessException error) {
                        throw new IllegalStateException(error);
                    }
                }).get(10, TimeUnit.SECONDS);
            }
        } finally {
            context.deleteDatabase(name);
        }
    }
}
