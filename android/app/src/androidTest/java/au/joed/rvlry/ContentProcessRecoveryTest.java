package au.joed.rvlry;

import static org.junit.Assert.assertArrayEquals;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.FixMethodOrder;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.MethodSorters;

/** Run these methods separately with force-stop between them to verify process recovery. */
@RunWith(AndroidJUnit4.class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
public class ContentProcessRecoveryTest {
    private static final String NAME = "content-process-recovery-test.db";
    private static final String PREVIOUS = "{\"schemaVersion\":1,\"kind\":\"trivia\",\"version\":1,\"entries\":[]}";
    private static final String CURRENT = "{\"schemaVersion\":1,\"kind\":\"trivia\",\"version\":2,\"entries\":[]}";

    @Test
    public void aWriteCheckpoint() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        context.deleteDatabase(NAME);
        try (ContentDatabase store = new ContentDatabase(context, NAME)) {
            store.install("trivia", PREVIOUS, null);
            store.install("trivia", CURRENT, PREVIOUS);
        }
    }

    @Test
    public void bReadCheckpointAfterRestart() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        try (ContentDatabase store = new ContentDatabase(context, NAME)) {
            assertArrayEquals(new String[] { CURRENT, PREVIOUS }, store.read("trivia"));
        } finally {
            context.deleteDatabase(NAME);
        }
    }
}
