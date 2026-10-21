package au.joed.rvlry;

import static org.junit.Assert.assertTrue;

import android.content.Context;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.ExecutorService;
import java.lang.reflect.Field;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class AppRenderTest {
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

    private void awaitCondition(MainActivity activity, String expression) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(20);
        do {
            if ("true".equals(evaluate(activity, expression))) {
                return;
            }
            Thread.sleep(100);
        } while (System.nanoTime() < deadline);
        String diagnostics = evaluate(activity, "JSON.stringify({title:document.title,href:location.href,ready:document.readyState,text:document.body?.innerText,html:document.body?.innerHTML?.slice(0,3000)})");
        throw new AssertionError("App did not render expected state: " + diagnostics);
    }

    private void clickButton(MainActivity activity, String label) throws Exception {
        String expression = "[...document.querySelectorAll('button')].find(button => button.textContent.trim()==='" + label + "' && !button.disabled)";
        awaitCondition(activity, "!!(" + expression + ")");
        evaluate(activity, "(" + expression + ").click()");
    }

    @Test
    public void bundledApplicationRestoresThemeFromNativeStorage() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        String key = "app.appearance.v1";
        try (SnapshotDatabase database = new SnapshotDatabase(context)) {
            String[] original = database.read(key);
            try {
                database.write(key, "{\"storageVersion\":1,\"revision\":1,\"savedAt\":\"2026-10-22T00:00:00.000Z\",\"payload\":{\"schemaVersion\":1,\"theme\":\"observatory\"}}");
                try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
                    AtomicReference<MainActivity> activity = new AtomicReference<>();
                    scenario.onActivity(activity::set);
                    awaitCondition(activity.get(), "document.documentElement.dataset.theme==='observatory' && !!document.querySelector('a[href*=whowhatwhere]')");
                }
            } finally {
                database.remove(key);
                if (original[1] != null) database.write(key, original[1]);
                if (original[0] != null) database.write(key, original[0]);
            }
        }
    }

    @Test
    public void bundledApplicationRendersHubAndOpensWhoWhatWhere() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        String testDatabase = "snapshot-app-render-test.db";
        context.deleteDatabase(testDatabase);
        ExecutorService worker = null;
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            AtomicReference<MainActivity> activityRef = new AtomicReference<>();
            scenario.onActivity(activityRef::set);
            MainActivity activity = activityRef.get();
            awaitCondition(activity, "document.body.innerText.includes('RVLRY') && document.body.innerText.includes('Who What Where') && !!document.querySelector('a[href*=whowhatwhere]')");
            System.out.println("RVLRY_RENDER_HUB " + evaluate(activity, "JSON.stringify({title:document.title,href:location.href,text:document.body.innerText.slice(0,1000),width:innerWidth,height:innerHeight})"));
            // Route this test's real native bridge into a disposable database before the game loads.
            // Keep the installed application's actual saved games untouched.
            RvlryDevicePlugin plugin = (RvlryDevicePlugin) activity.getBridge().getPlugin("RvlryDevice").getInstance();
            Field databaseField = RvlryDevicePlugin.class.getDeclaredField("database");
            databaseField.setAccessible(true);
            ((SnapshotDatabase) databaseField.get(plugin)).close();
            databaseField.set(plugin, new SnapshotDatabase(context, testDatabase));
            Field workerField = RvlryDevicePlugin.class.getDeclaredField("storage");
            workerField.setAccessible(true);
            worker = (ExecutorService) workerField.get(plugin);
            // Exercise the actual chooser and SQLite preference in the disposable database.
            evaluate(activity, "document.querySelector('[aria-label=Settings]').click()");
            for (String theme : new String[] { "pub-trivia", "bookclub", "observatory", "classic", "recess" }) {
                awaitCondition(activity, "!!document.querySelector('input[value=\"" + theme + "\"]:enabled')");
                evaluate(activity, "document.querySelector('input[value=\"" + theme + "\"]').click()");
                awaitCondition(activity, "document.documentElement.dataset.theme==='" + theme + "' && !document.querySelector('fieldset[disabled]')");
            }
            try (SnapshotDatabase saved = new SnapshotDatabase(context, testDatabase)) {
                assertTrue(saved.read("app.appearance.v1")[0].contains("recess"));
            }
            evaluate(activity, "document.querySelector('[aria-label=\"Close dialog\"]').click()");
            evaluate(activity, "document.querySelector('a[href*=whowhatwhere]').click()");
            awaitCondition(activity, "document.body.innerText.includes('Game settings') && document.body.innerText.includes('Turn length') && document.body.innerText.includes('Categories')");
            System.out.println("RVLRY_RENDER_SETTINGS " + evaluate(activity, "JSON.stringify({href:location.href,text:document.body.innerText.slice(0,1000)})"));
            awaitCondition(activity, "[...document.querySelectorAll('button')].some(button => button.textContent.trim()==='Next: Team 1' && !button.disabled)");
            evaluate(activity, "[...document.querySelectorAll('button')].find(button => button.textContent.trim()==='Next: Team 1').click()");
            awaitCondition(activity, "document.body.innerText.includes('Team 1 of 2') && document.querySelectorAll('input').length >= 3");
            clickButton(activity, "Save team");
            awaitCondition(activity, "document.body.innerText.includes('Team 2 of 2')");
            clickButton(activity, "Save team");
            awaitCondition(activity, "document.body.innerText.includes('Review teams')");
            clickButton(activity, "Start game");
            awaitCondition(activity, "document.body.innerText.includes('Pass to')");
            awaitCondition(activity, "[...document.querySelectorAll('button')].some(button => button.textContent.includes(', start turn') && !button.disabled)");
            evaluate(activity, "[...document.querySelectorAll('button')].find(button => button.textContent.includes(', start turn')).click()");
            awaitCondition(activity, "!!document.querySelector('[aria-label=\"Active turn\"]')");
            clickButton(activity, "Skip");
            awaitCondition(activity, "document.body.innerText.includes('Skipped · 1')");
            clickButton(activity, "Correct");
            awaitCondition(activity, "document.body.innerText.includes('Guessed · 1')");
            clickButton(activity, "Pause turn");
            awaitCondition(activity, "document.body.innerText.includes('Take your time') && !document.querySelector('[aria-label=\"Active turn\"]') && !document.querySelector('[role=alert]')");
            clickButton(activity, "Start new game");
            awaitCondition(activity, "document.body.innerText.includes('Replace the saved game?')");
            clickButton(activity, "Keep saved game");
            awaitCondition(activity, "document.body.innerText.includes('Take your time')");
            System.out.println("RVLRY_NATIVE_FLOW_OK: setup, handoff, skip, correct, pause, cancel replacement");
            evaluate(activity, "location.hash='/'");
            awaitCondition(activity, "!!document.querySelector('a[href*=\"games/hat\"]')");
            evaluate(activity, "document.querySelector('a[href*=\"games/hat\"]').click()");
            clickButton(activity, "Next: Team 1");
            clickButton(activity, "Save team");
            clickButton(activity, "Save team");
            clickButton(activity, "Enter private figures");
            for (int player = 0; player < 4; player++) {
                awaitCondition(activity, "[...document.querySelectorAll('footer button')].some(b=>b.textContent.includes('I’m')&&!b.disabled)");
                evaluate(activity, "document.querySelector('footer button').click()");
                awaitCondition(activity, "document.querySelectorAll('[data-hat-device-clue]').length===6");
                for (int clue = 1; clue <= 6; clue++) {
                    evaluate(activity, "document.querySelector('[aria-label=\"Suggest famous figure " + clue + "\"]').click()");
                    Thread.sleep(80);
                }
                clickButton(activity, player == 3 ? "Confirm and start game" : "Confirm and pass on");
            }
            awaitCondition(activity, "[...document.querySelectorAll('footer button')].some(b=>b.textContent.includes(', start turn')&&!b.disabled)");
            evaluate(activity, "document.querySelector('footer button').click()");
            clickButton(activity, "Skip");
            awaitCondition(activity, "document.body.innerText.includes('Skipped · 1')");
            clickButton(activity, "Correct");
            awaitCondition(activity, "document.body.innerText.includes('Guessed · 1')");
            clickButton(activity, "Pause turn");
            awaitCondition(activity, "document.body.innerText.includes('Take your time')&&!document.querySelector('[role=alert]')");
            System.out.println("RVLRY_NATIVE_HAT_OK: private entry, handoff, skip, correct, pause");
            evaluate(activity, "location.hash='/'");
            awaitCondition(activity, "!!document.querySelector('a[href*=imposter]')");
            evaluate(activity, "document.querySelector('a[href*=imposter]').click()");
            clickButton(activity, "Continue to players");
            clickButton(activity, "Review players");
            clickButton(activity, "Deal roles");
            for (int player = 0; player < 6; player++) {
                awaitCondition(activity, "document.body.innerText.includes('Pass to Player " + (player + 1) + "')");
                clickButton(activity, "Reveal my role");
                if (player == 0) {
                    String firstRole = evaluate(activity, "document.querySelector('main h3').textContent");
                    evaluate(activity, "window.dispatchEvent(new Event('rvlry:back',{cancelable:true}))");
                    awaitCondition(activity, "document.body.innerText.includes('Game covered')");
                    clickButton(activity, "Continue");
                    awaitCondition(activity, "document.body.innerText.includes('Pass to Player 1')");
                    clickButton(activity, "Reveal my role");
                    assertTrue("Role changed after interruption", firstRole.equals(evaluate(activity, "document.querySelector('main h3').textContent")));
                }
                clickButton(activity, player == 5 ? "Hide role and begin clues" : "Hide role and pass phone");
            }
            clickButton(activity, "Ready for discussion");
            clickButton(activity, "Vote done");
            clickButton(activity, "Reveal the answer");
            awaitCondition(activity, "document.body.innerText.includes('The reveal') && document.body.innerText.includes('Secret word') && !document.querySelector('[role=alert]')");
            clickButton(activity, "Game picker");
            awaitCondition(activity, "!!document.querySelector('a[href*=whowhatwhere]')");
            evaluate(activity, "document.querySelector('a[href*=whowhatwhere]').click()");
            awaitCondition(activity, "document.body.innerText.includes('Resume saved game') || document.body.innerText.includes('Resume game')");
            System.out.println("RVLRY_NATIVE_IMPOSTER_OK: private deal, cover/reveal same role, all players, discussion, final reveal, WWW save retained");


        } finally {
            if (worker != null) {
                assertTrue("Native storage worker did not finish", worker.awaitTermination(10, TimeUnit.SECONDS));
            }
            context.deleteDatabase(testDatabase);
        }
    }
}
