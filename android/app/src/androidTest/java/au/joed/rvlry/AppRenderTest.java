package au.joed.rvlry;

import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.view.WindowManager;
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
                InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
                    assertTrue("Screenshots must remain allowed on every game screen",
                        (activity.getWindow().getAttributes().flags & WindowManager.LayoutParams.FLAG_SECURE) == 0));
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

    private void awaitBundledArtwork(MainActivity activity, String theme, String sheet) throws Exception {
        String path = "/artwork/" + sheet + ".png";
        awaitCondition(activity,
            "(()=>{const artwork=[...document.querySelectorAll('main [data-game-artwork]')];"
            + "return artwork.length===3 && ['www','hat','imposter'].every(game=>{"
            + "const node=artwork.find(item=>item.dataset.gameArtwork===game);"
            + "if(!node)return false;const bounds=node.getBoundingClientRect();"
            + "const style=getComputedStyle(node);"
            + "return node.dataset.artworkTheme==='" + theme + "'"
            + "&& node.querySelector('image')?.getAttribute('href')==='" + path + "'"
            + "&& bounds.width>0 && bounds.height>0 && style.display!=='none' && style.visibility==='visible';"
            + "});})()");
        // Decode through the APK's local WebView origin, without any remote image source.
        evaluate(activity,
            "(()=>{const image=new Image();window.__rvlryArtworkDecode={status:'pending'};"
            + "image.src=new URL('" + path + "',location.origin).href;"
            + "image.decode().then(()=>{window.__rvlryArtworkDecode={status:'loaded',"
            + "width:image.naturalWidth,height:image.naturalHeight};},"
            + "()=>{window.__rvlryArtworkDecode={status:'failed'};});})()");
        awaitCondition(activity, "window.__rvlryArtworkDecode.status!=='pending'");
        assertTrue("Bundled artwork failed to decode for " + theme + ": " + path,
            "true".equals(evaluate(activity,
                "window.__rvlryArtworkDecode.status==='loaded'"
                + "&& window.__rvlryArtworkDecode.width>0 && window.__rvlryArtworkDecode.height>0")));
    }

    @Test
    public void bundledApplicationRestoresThemeFromNativeStorage() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        String key = "app.appearance.v1";
        try (SnapshotDatabase database = new SnapshotDatabase(context)) {
            String[] original = database.read(key);
            String[] originalContent = database.read("app.content.v1");
            try {
                database.write("app.content.v1", "{\"storageVersion\":1,\"revision\":1,\"savedAt\":\"2026-10-22T00:00:00.000Z\",\"payload\":{\"schemaVersion\":1,\"kidsMode\":true}}");
                database.write(key, "{\"storageVersion\":1,\"revision\":1,\"savedAt\":\"2026-10-22T00:00:00.000Z\",\"payload\":{\"schemaVersion\":1,\"theme\":\"observatory\"}}");
                try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
                    AtomicReference<MainActivity> activity = new AtomicReference<>();
                    scenario.onActivity(activity::set);
                    awaitCondition(activity.get(), "document.documentElement.dataset.theme==='observatory' && !!document.querySelector('a[href*=whowhatwhere]')");
                    evaluate(activity.get(), "document.querySelector('[aria-label=Settings]').click()");
                    awaitCondition(activity.get(), "document.querySelector('[role=switch]')?.getAttribute('aria-checked')==='true'");
                }
            } finally {
                database.remove(key);
                if (original[1] != null) database.write(key, original[1]);
                if (original[0] != null) database.write(key, original[0]);
                database.remove("app.content.v1");
                if (originalContent[1] != null) database.write("app.content.v1", originalContent[1]);
                if (originalContent[0] != null) database.write("app.content.v1", originalContent[0]);
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
            awaitCondition(activity, "!!document.querySelector('[role=switch]:enabled')");
            evaluate(activity, "document.querySelector('[role=switch]').click()");
            awaitCondition(activity, "!!document.querySelector('[role=switch]:enabled')");
            evaluate(activity, "if(document.querySelector('[role=switch]').getAttribute('aria-checked')!=='true')document.querySelector('[role=switch]').click()");
            awaitCondition(activity, "document.querySelector('[role=switch]:enabled')?.getAttribute('aria-checked')==='true'");
            for (String[] artwork : new String[][] {
                { "pub-trivia", "pub" }, { "bookclub", "bookclub" },
                { "observatory", "engraved" }, { "classic", "tabletop" }, { "recess", "paper" }
            }) {
                String theme = artwork[0];
                awaitCondition(activity, "!!document.querySelector('input[value=\"" + theme + "\"]:enabled')");
                evaluate(activity, "document.querySelector('input[value=\"" + theme + "\"]').click()");
                awaitCondition(activity, "document.documentElement.dataset.theme==='" + theme + "' && !document.querySelector('fieldset[disabled]')");
                evaluate(activity, "document.querySelector('[aria-label=\"Close dialog\"]').click()");
                awaitCondition(activity, "!document.querySelector('[role=dialog]')");
                awaitBundledArtwork(activity, theme, artwork[1]);
                evaluate(activity, "document.querySelector('[aria-label=Settings]').click()");
            }
            try (SnapshotDatabase saved = new SnapshotDatabase(context, testDatabase)) {
                assertTrue(saved.read("app.appearance.v1")[0].contains("recess"));
                assertTrue(saved.read("app.content.v1")[0].contains("\"kidsMode\":true"));
            }
            evaluate(activity, "document.querySelector('[aria-label=\"Close dialog\"]').click()");
            evaluate(activity, "document.querySelector('a[href*=whowhatwhere]').click()");
            awaitCondition(activity, "document.body.innerText.includes('Game settings') && document.body.innerText.includes('Turn length') && document.body.innerText.includes('Categories')");
            System.out.println("RVLRY_RENDER_SETTINGS " + evaluate(activity, "JSON.stringify({href:location.href,text:document.body.innerText.slice(0,1000)})"));
            clickButton(activity, "Easy");
            awaitCondition(activity, "[...document.querySelectorAll('button')].some(button => button.textContent.trim()==='Next: Team 1' && !button.disabled)");
            evaluate(activity, "[...document.querySelectorAll('button')].find(button => button.textContent.trim()==='Next: Team 1').click()");
            awaitCondition(activity, "document.body.innerText.includes('Team 1 of 2') && document.querySelectorAll('input').length >= 3");
            clickButton(activity, "Save team");
            awaitCondition(activity, "document.body.innerText.includes('Team 2 of 2')");
            clickButton(activity, "Save team");
            awaitCondition(activity, "document.body.innerText.includes('Review teams')");
            clickButton(activity, "Start game");
            awaitCondition(activity, "document.body.innerText.includes('Pass to')");
            try (SnapshotDatabase saved = new SnapshotDatabase(context, testDatabase)) {
                String snapshot = saved.read("whowhatwhere.device-session.v1")[0];
                assertTrue(snapshot.contains("\"kidsMode\":true"));
                assertTrue(snapshot.contains("\"wordDifficulty\":\"easy\""));
            }
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
            clickButton(activity, "Easy");
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

            // Synthetic question exists only in the disposable test database, never the shipped corpus.
            String triviaFixture = """
                {"storageVersion":1,"revision":1,"savedAt":"2026-10-22T00:00:00.000Z","payload":{
                  "schemaVersion":3,"savedAt":"2026-10-22T00:00:00.000Z",
                  "settings":{"count":1,"categories":["general"],"revealMode":"end","difficulty":"all"},
                  "quiz":{"settings":{"count":1,"categories":["general"],"revealMode":"end","difficulty":"all"},
                    "cursor":0,"phase":"questions","kidsMode":true,"packVersion":1,"items":[{
                      "question":{"id":"trivia:native-fixture","revision":1,"question":"Native fixture question?","answer":"Fixture answer",
                        "acceptableAnswers":[],"category":"general","difficulty":"easy","kidAppropriate":true,
                        "review":{"reviewedAt":"2026-10-22T00:00:00.000Z","reviewer":"Test fixture only","sources":["https://example.com"]}},
                      "shownAt":"2026-10-22T00:00:00.000Z","writtenAnswer":"","revealed":false,"mark":null,"excluded":false}]}}}
                """;
            try (SnapshotDatabase saved = new SnapshotDatabase(context, testDatabase)) {
                saved.write("trivia.device.v3", triviaFixture);
            }
            evaluate(activity, "location.hash='/'");
            awaitCondition(activity, "!!document.querySelector('a[href*=whowhatwhere]')");
            assertTrue("Trivia must be hidden by default", "true".equals(evaluate(activity, "!document.querySelector('a[href*=trivia]')")));
            evaluate(activity, "document.querySelector('[aria-label=Settings]').click()");
            awaitCondition(activity, "!!document.querySelector('[aria-labelledby=trivia-enabled-label]:enabled')");
            evaluate(activity, "document.querySelector('[aria-labelledby=trivia-enabled-label]').click()");
            awaitCondition(activity, "document.querySelector('[aria-labelledby=trivia-enabled-label]:enabled')?.getAttribute('aria-checked')==='true'");
            evaluate(activity, "document.querySelector('[aria-label=\"Close dialog\"]').click()");
            awaitCondition(activity, "!!document.querySelector('a[href*=trivia]')");
            evaluate(activity, "document.querySelector('a[href*=trivia]').click()");
            clickButton(activity, "Resume");
            awaitCondition(activity, "document.body.innerText.includes('Native fixture question?') && document.querySelector('textarea')?.placeholder==='Your answer (optional)'");
            evaluate(activity, "(()=>{const field=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(field,'fIXTURE ANSWER   ');field.dispatchEvent(new Event('input',{bubbles:true}));})()");
            awaitCondition(activity, "[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Reveal answers'&&!b.disabled)");
            try (SnapshotDatabase saved = new SnapshotDatabase(context, testDatabase)) {
                assertTrue("Written answer was not committed", saved.read("trivia.device.v3")[0].contains("fIXTURE ANSWER"));
                assertTrue("Visibility was not committed", saved.read("app.features.v1")[0].contains("\"triviaEnabled\":true"));
            }
            evaluate(activity, "location.reload()");
            clickButton(activity, "Resume");
            awaitCondition(activity, "document.querySelector('textarea')?.value==='fIXTURE ANSWER   '");
            clickButton(activity, "Reveal answers");
            awaitCondition(activity, "document.body.innerText.includes('Fixture answer') && [...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Correct'&&b.getAttribute('aria-pressed')==='true')");
            clickButton(activity, "Incorrect");
            awaitCondition(activity, "[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Incorrect'&&b.getAttribute('aria-pressed')==='true') && [...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Correct'&&b.getAttribute('aria-pressed')==='false')");
            clickButton(activity, "Correct");
            awaitCondition(activity, "[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Correct'&&b.getAttribute('aria-pressed')==='true')");
            clickButton(activity, "Finish quiz");
            awaitCondition(activity, "document.body.innerText.includes('Quiz complete') && document.body.innerText.includes('1 of 1 correct') && document.querySelector('[aria-label=\"Question recap\"]')?.textContent.includes('Native fixture question?') && document.querySelector('[aria-label=\"Question recap\"]')?.textContent.includes('Fixture answer') && document.querySelector('[aria-label=\"Question recap\"]')?.textContent.includes('fIXTURE ANSWER') && !document.querySelector('[role=alert]')");
            System.out.println("RVLRY_NATIVE_TRIVIA_OK: visibility, saved quiz, written answer reload, automatic mark, manual override, score and recap");

            evaluate(activity, "location.hash='/'");
            awaitCondition(activity, "!!document.querySelector('a[href*=trivia]')");
            evaluate(activity, "document.querySelector('[aria-label=Settings]').click()");
            awaitCondition(activity, "!!document.querySelector('[aria-labelledby=kids-mode-label]:enabled')");
            evaluate(activity, "if(document.querySelector('[aria-labelledby=kids-mode-label]').getAttribute('aria-checked')==='true')document.querySelector('[aria-labelledby=kids-mode-label]').click()");
            awaitCondition(activity, "document.querySelector('[aria-labelledby=kids-mode-label]:enabled')?.getAttribute('aria-checked')==='false'");
            evaluate(activity, "document.querySelector('[aria-label=\"Close dialog\"]').click()");
            evaluate(activity, "document.querySelector('a[href*=trivia]').click()");
            clickButton(activity, "Start new quiz");
            awaitCondition(activity, "!!document.querySelector('dialog[open]')");
            evaluate(activity, "[...document.querySelectorAll('dialog[open] button')].find(b=>b.textContent.trim()==='Start new quiz').click()");
            awaitCondition(activity, "document.body.innerText.includes('Set up your quiz')");
            evaluate(activity, "document.querySelector('details').open=true");
            evaluate(activity, "document.querySelectorAll('input[type=checkbox]').forEach(box=>{if(!box.checked)box.click();})");
            clickButton(activity, "30");
            clickButton(activity, "Start quiz");
            awaitCondition(activity, "document.body.innerText.includes('Question 1 of 30') && !document.querySelector('[role=alert]')");
            try (SnapshotDatabase saved = new SnapshotDatabase(context, testDatabase)) {
                String snapshot = saved.read("trivia.device.v3")[0];
                assertTrue("Starter bank version not captured", snapshot.contains("\"packVersion\":2"));
                assertTrue("Synthetic fixture must not appear in the real bank", !snapshot.contains("native-fixture"));
            }
            System.out.println("RVLRY_NATIVE_TRIVIA_STARTER_OK: new 30-question quiz from bundled version 2");


        } finally {
            if (worker != null) {
                assertTrue("Native storage worker did not finish", worker.awaitTermination(10, TimeUnit.SECONDS));
            }
            context.deleteDatabase(testDatabase);
        }
    }
}
