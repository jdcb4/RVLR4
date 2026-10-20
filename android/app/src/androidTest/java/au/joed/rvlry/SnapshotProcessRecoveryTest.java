package au.joed.rvlry;

import static org.junit.Assert.assertArrayEquals;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.FixMethodOrder;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.MethodSorters;

/** DeviceTest also runs these methods in separate processes with force-stop in between. */
@RunWith(AndroidJUnit4.class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
public class SnapshotProcessRecoveryTest {
    private static final String NAME = "snapshot-process-recovery-test.db";

    @Test
    public void aWriteCheckpoint() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        context.deleteDatabase(NAME);
        try (SnapshotDatabase store = new SnapshotDatabase(context, NAME)) {
            store.write("process-smoke", "previous");
            store.write("process-smoke", "committed");
        }
    }

    @Test
    public void bReadCheckpointAfterRestart() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        try (SnapshotDatabase store = new SnapshotDatabase(context, NAME)) {
            assertArrayEquals(new String[] { "committed", "previous" }, store.read("process-smoke"));
            store.remove("process-smoke");
        } finally {
            context.deleteDatabase(NAME);
        }
    }
}
