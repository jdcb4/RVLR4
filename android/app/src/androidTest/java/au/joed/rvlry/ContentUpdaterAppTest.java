package au.joed.rvlry;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.getcapacitor.WebViewListener;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Exercises the shipped updater, merge service and native SQLite through Settings. */
@RunWith(AndroidJUnit4.class)
public class ContentUpdaterAppTest {
    private static final String CONTENT_DATABASE = "content-updater-app-test.db";
    private static final String SNAPSHOT_DATABASE = "snapshot-content-updater-app-test.db";
    private static final String MANIFEST_URL = "https://content.jboxgames.com/rvlry/v1/manifest.json";
    private static final String NEW_WORD = "Native Aurora Lantern";
    private static final String WWW_KEY = "whowhatwhere.device-session.v1";
    private static final String[] SESSION_KEYS = {
        WWW_KEY, "hat.device-session.v1", "imposter.device-session.v1", "trivia.device.v3"
    };

    private String evaluate(MainActivity activity, String javascript) throws Exception {
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch completed = new CountDownLatch(1);
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
            activity.getBridge().getWebView().evaluateJavascript(javascript, value -> {
                result.set(value);
                completed.countDown();
            }));
        assertTrue("WebView evaluation timed out", completed.await(10, TimeUnit.SECONDS));
        return result.get();
    }

    private void awaitCondition(MainActivity activity, String expression) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(20);
        do {
            if ("true".equals(evaluate(activity, expression))) return;
            Thread.sleep(100);
        } while (System.nanoTime() < deadline);
        throw new AssertionError("Updater app state did not arrive: " + evaluate(activity,
            "JSON.stringify({text:document.body?.innerText,requests:window.__rvlryUpdateRequests})"));
    }

    private void clickButton(MainActivity activity, String label) throws Exception {
        String expression = "[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==="
            + JSONObject.quote(label) + "&&!button.disabled)";
        awaitCondition(activity, "!!(" + expression + ")");
        evaluate(activity, "(" + expression + ").click()");
    }

    private void reloadPage(MainActivity activity) throws Exception {
        CountDownLatch loaded = new CountDownLatch(1);
        WebViewListener listener = new WebViewListener() {
            private boolean started;

            @Override
            public void onPageStarted(WebView view) {
                if (view == activity.getBridge().getWebView()) started = true;
            }

            @Override
            public void onPageLoaded(WebView view) {
                if (started && view == activity.getBridge().getWebView()) loaded.countDown();
            }
        };
        try {
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
                activity.getBridge().addWebViewListener(listener);
                activity.getBridge().getWebView().reload();
            });
            assertTrue("Reloaded WebView did not finish loading", loaded.await(20, TimeUnit.SECONDS));
        } finally {
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
                activity.getBridge().removeWebViewListener(listener));
        }
        awaitCondition(activity, "!!document.querySelector('a[href*=whowhatwhere]')");
    }

    private JSONObject entry(String word, String category, String hint, String difficulty) throws Exception {
        return new JSONObject().put("word", word).put("category", category).put("hint", hint)
            .put("difficulty", difficulty).put("kidAppropriate", false).put("kidTargeted", false)
            .put("aliases", new JSONArray()).put("originalIds", new JSONArray())
            .put("games", new JSONArray().put("www"));
    }

    private JSONObject pack(int version, JSONArray entries, JSONArray removedIds) throws Exception {
        return new JSONObject().put("schemaVersion", 1).put("kind", "words").put("version", version)
            .put("publishedAt", "2026-10-23T00:00:00.000Z").put("entries", entries)
            .put("removedIds", removedIds);
    }

    private void installThroughSettings(MainActivity activity, JSONObject pack) throws Exception {
        String raw = pack.toString();
        byte[] bytes = raw.getBytes(StandardCharsets.UTF_8);
        StringBuilder checksum = new StringBuilder();
        for (byte value : MessageDigest.getInstance("SHA-256").digest(bytes)) {
            checksum.append(String.format("%02x", value & 0xff));
        }
        String packUrl = "https://content.jboxgames.com/rvlry/v1/native-test-words-"
            + pack.getInt("version") + ".json";
        String manifest = new JSONObject().put("schemaVersion", 1).put("packs", new JSONArray().put(
            new JSONObject().put("kind", "words").put("version", pack.getInt("version"))
                .put("url", packUrl).put("bytes", bytes.length).put("sha256", checksum.toString())
        )).toString();
        evaluate(activity, "document.querySelector('[aria-label=Settings]').click()");
        awaitCondition(activity, "!!document.querySelector('[aria-label=\"Content updates\"]')");
        try {
            // Intercept only this fixture's manifest/pack; restore the browser function even on failure.
            evaluate(activity, "window.__rvlryOriginalFetch=window.fetch;window.__rvlryUpdateRequests=[];"
                + "window.fetch=function(input,options){const url=typeof input==='string'?input:input.url;"
                + "let body;if(url===" + JSONObject.quote(MANIFEST_URL) + ")body=" + JSONObject.quote(manifest) + ";"
                + "else if(url===" + JSONObject.quote(packUrl) + ")body=" + JSONObject.quote(raw) + ";"
                + "else return window.__rvlryOriginalFetch.call(this,input,options);"
                + "window.__rvlryUpdateRequests.push(url);"
                + "return Promise.resolve(new Response(body,{status:200,headers:{'Content-Type':'application/json'}}));};");
            clickButton(activity, "Check for new words");
            awaitCondition(activity, "document.querySelector('[aria-label=\"Content updates\"] [role=status]')"
                + "?.textContent==='New words are ready for new games.'"
                + "&& !document.querySelector('[aria-label=\"Content updates\"] button').disabled");
            assertEquals("Only the advertised fixture manifest and pack should be fetched", "true",
                evaluate(activity, "window.__rvlryUpdateRequests.length===2"
                    + "&& window.__rvlryUpdateRequests[0]===" + JSONObject.quote(MANIFEST_URL)
                    + "&& window.__rvlryUpdateRequests[1]===" + JSONObject.quote(packUrl)));
        } finally {
            evaluate(activity, "if(window.__rvlryOriginalFetch){window.fetch=window.__rvlryOriginalFetch;"
                + "delete window.__rvlryOriginalFetch;}");
            evaluate(activity, "document.querySelector('[aria-label=\"Close dialog\"]')?.click()");
        }
    }

    private boolean hasWord(JSONObject installed, String word) throws Exception {
        JSONArray entries = installed.getJSONArray("entries");
        for (int index = 0; index < entries.length(); index++) {
            if (word.equals(entries.getJSONObject(index).getString("word"))) return true;
        }
        return false;
    }

    private void assertSessionsUnchanged(SnapshotDatabase snapshots, Map<String, String[]> expected) {
        for (Map.Entry<String, String[]> saved : expected.entrySet()) {
            assertArrayEquals("Content updates changed game session " + saved.getKey(),
                saved.getValue(), snapshots.read(saved.getKey()));
        }
    }

    @Test
    public void settingsUpdatesMergePersistAndRestoreWordsWithoutChangingGames() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        context.deleteDatabase(CONTENT_DATABASE);
        context.deleteDatabase(SNAPSHOT_DATABASE);
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class);
             ContentDatabase content = new ContentDatabase(context, CONTENT_DATABASE);
             SnapshotDatabase snapshots = new SnapshotDatabase(context, SNAPSHOT_DATABASE)) {
            AtomicReference<MainActivity> activityRef = new AtomicReference<>();
            scenario.onActivity(activityRef::set);
            MainActivity activity = activityRef.get();
            awaitCondition(activity, "!!document.querySelector('a[href*=whowhatwhere]')");
            RvlryDevicePlugin plugin = (RvlryDevicePlugin) activity.getBridge().getPlugin("RvlryDevice").getInstance();
            Field contentField = RvlryDevicePlugin.class.getDeclaredField("contentDatabase");
            Field snapshotField = RvlryDevicePlugin.class.getDeclaredField("database");
            Field workerField = RvlryDevicePlugin.class.getDeclaredField("storage");
            contentField.setAccessible(true);
            snapshotField.setAccessible(true);
            workerField.setAccessible(true);
            ExecutorService worker = (ExecutorService) workerField.get(plugin);
            ContentDatabase originalContent = (ContentDatabase) contentField.get(plugin);
            SnapshotDatabase originalSnapshots = (SnapshotDatabase) snapshotField.get(plugin);
            AtomicReference<Boolean> originalBlockNetworkLoads = new AtomicReference<>();
            worker.submit(() -> {
                try {
                    contentField.set(plugin, content);
                    snapshotField.set(plugin, snapshots);
                } catch (IllegalAccessException error) {
                    throw new IllegalStateException(error);
                }
            }).get(10, TimeUnit.SECONDS);
            try {
                Map<String, String[]> sessions = new LinkedHashMap<>();
                for (String key : SESSION_KEYS) {
                    snapshots.write(key, "existing previous " + key);
                    snapshots.write(key, "existing current " + key);
                    sessions.put(key, snapshots.read(key));
                }
                reloadPage(activity); // Start the real app against only the disposable databases.
                assertSessionsUnchanged(snapshots, sessions);

                // A no-op upsert measures the actual bundled pool without hard-coding its changing size.
                JSONObject bundled = entry("*NSYNC", "Who", "American boy band", "medium")
                    .put("originalIds", new JSONArray().put("www:2999"));
                installThroughSettings(activity, pack(2, new JSONArray().put(bundled), new JSONArray()));
                JSONObject baseline = new JSONObject(content.read("words")[0]);
                int bundledCount = baseline.getJSONArray("entries").length();
                assertTrue("The stored body must contain the bundled pool, not just the upsert", bundledCount > 1000);
                assertTrue(hasWord(baseline, "*NSYNC"));
                assertFalse(hasWord(baseline, NEW_WORD));

                installThroughSettings(activity, pack(3, new JSONArray().put(
                    entry(NEW_WORD, "What", "Synthetic native updater fixture", "easy")), new JSONArray()));
                JSONObject addition = new JSONObject(content.read("words")[0]);
                assertEquals(bundledCount + 1, addition.getJSONArray("entries").length());
                assertTrue(hasWord(addition, NEW_WORD));
                assertTrue("Omitting a bundled item must not delete it", hasWord(addition, "*NSYNC"));
                assertSessionsUnchanged(snapshots, sessions);

                installThroughSettings(activity, pack(4, new JSONArray(), new JSONArray()));
                String omittedRaw = content.read("words")[0];
                JSONObject omitted = new JSONObject(omittedRaw);
                assertEquals(bundledCount + 1, omitted.getJSONArray("entries").length());
                assertTrue("Omission must retain installed additions", hasWord(omitted, NEW_WORD));
                assertSessionsUnchanged(snapshots, sessions);

                InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
                    originalBlockNetworkLoads.set(activity.getBridge().getWebView().getSettings().getBlockNetworkLoads());
                    activity.getBridge().getWebView().getSettings().setBlockNetworkLoads(true);
                });
                reloadPage(activity);
                assertEquals("Offline startup changed the installed catalogue", omittedRaw, content.read("words")[0]);
                assertSessionsUnchanged(snapshots, sessions);

                // Deliberately create a new game after proving every pre-existing key was untouched.
                snapshots.remove(WWW_KEY);
                evaluate(activity, "window.__rvlryOriginalRandom=Math.random;Math.random=()=>0.999999;"
                    + "document.querySelector('a[href*=whowhatwhere]').click()");
                clickButton(activity, "Next: Team 1");
                clickButton(activity, "Save team");
                clickButton(activity, "Save team");
                clickButton(activity, "Start game");
                awaitCondition(activity, "document.body.innerText.includes('Pass to')");
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(20);
                String fresh;
                do {
                    fresh = snapshots.read(WWW_KEY)[0];
                    if (fresh != null && fresh.contains(NEW_WORD) && fresh.contains("\"wordPool\"")) break;
                    Thread.sleep(100);
                } while (System.nanoTime() < deadline);
                assertTrue("A new offline match must use the installed startup catalogue", fresh != null && fresh.contains(NEW_WORD));
                evaluate(activity, "Math.random=window.__rvlryOriginalRandom;delete window.__rvlryOriginalRandom;location.hash='/'");
                awaitCondition(activity, "!!document.querySelector('a[href*=whowhatwhere]')");
                // Route cleanup writes a paused checkpoint; observe that commit before comparing bytes.
                deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(20);
                do {
                    fresh = snapshots.read(WWW_KEY)[0];
                    if (fresh != null && new JSONObject(fresh).getJSONObject("payload").getBoolean("paused")) break;
                    Thread.sleep(100);
                } while (System.nanoTime() < deadline);
                assertTrue("Leaving the fresh match did not finish its paused checkpoint",
                    fresh != null && new JSONObject(fresh).getJSONObject("payload").getBoolean("paused"));
                sessions.put(WWW_KEY, snapshots.read(WWW_KEY));

                installThroughSettings(activity, pack(5, new JSONArray(), new JSONArray().put("word:nativeauroralantern")));
                JSONObject removed = new JSONObject(content.read("words")[0]);
                assertEquals(bundledCount, removed.getJSONArray("entries").length());
                assertFalse("Only the explicit tombstone may delete the addition", hasWord(removed, NEW_WORD));
                assertTrue(removed.getJSONArray("removedIds").toString().contains("word:nativeauroralantern"));
                assertTrue(hasWord(removed, "*NSYNC"));
                assertSessionsUnchanged(snapshots, sessions);
                assertTrue("The existing match must retain its frozen word pool", snapshots.read(WWW_KEY)[0].contains(NEW_WORD));
                System.out.println("RVLRY_NATIVE_CONTENT_UPDATER_OK: Settings fetch, additive merge, omission, offline startup, tombstone, unchanged games");
            } finally {
                try {
                    evaluate(activity, "if(window.__rvlryOriginalFetch)window.fetch=window.__rvlryOriginalFetch;"
                        + "if(window.__rvlryOriginalRandom)Math.random=window.__rvlryOriginalRandom;");
                    if (originalBlockNetworkLoads.get() != null) {
                        InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
                            activity.getBridge().getWebView().getSettings().setBlockNetworkLoads(originalBlockNetworkLoads.get()));
                    }
                } finally {
                    worker.submit(() -> {
                        try {
                            contentField.set(plugin, originalContent);
                            snapshotField.set(plugin, originalSnapshots);
                        } catch (IllegalAccessException error) {
                            throw new IllegalStateException(error);
                        }
                    }).get(10, TimeUnit.SECONDS);
                }
            }
        } finally {
            context.deleteDatabase(CONTENT_DATABASE);
            context.deleteDatabase(SNAPSHOT_DATABASE);
        }
    }
}
