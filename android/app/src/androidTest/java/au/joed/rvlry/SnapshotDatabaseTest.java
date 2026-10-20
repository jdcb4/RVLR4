package au.joed.rvlry;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertThrows;

import android.content.Context;
import android.database.sqlite.SQLiteException;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class SnapshotDatabaseTest {
    private static final String NAME = "snapshot-instrumentation-test.db";
    private Context context;
    private SnapshotDatabase store;

    @Before
    public void setUp() {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        context.deleteDatabase(NAME);
        store = new SnapshotDatabase(context, NAME);
    }

    @After
    public void tearDown() {
        store.close();
        context.deleteDatabase(NAME);
    }

    @Test
    public void committedSnapshotsSurviveDatabaseReopenAndRetainOnePrevious() {
        assertArrayEquals(new String[] { null, null }, store.read("www"));
        store.write("www", "first");
        assertArrayEquals(new String[] { "first", null }, store.read("www"));
        store.write("www", "second");
        store.write("www", "third");
        store.close();
        store = new SnapshotDatabase(context, NAME);
        assertArrayEquals(new String[] { "third", "second" }, store.read("www"));
    }

    @Test
    public void removeClearsBothSnapshotsWithoutAffectingOtherKeys() {
        store.write("www", "first");
        store.write("www", "second");
        store.write("settings", "kept");
        store.remove("www");
        store.remove("www");
        store.close();
        store = new SnapshotDatabase(context, NAME);
        assertArrayEquals(new String[] { null, null }, store.read("www"));
        assertArrayEquals(new String[] { "kept", null }, store.read("settings"));
    }

    @Test
    public void abortedReplacementKeepsBothCommittedCheckpoints() {
        store.write("www", "first");
        store.write("www", "second");
        store.getWritableDatabase().execSQL("CREATE TRIGGER fail_snapshot_update BEFORE UPDATE ON snapshots BEGIN SELECT RAISE(ABORT, 'test failure'); END");
        assertThrows(SQLiteException.class, () -> store.write("www", "third"));
        assertArrayEquals(new String[] { "second", "first" }, store.read("www"));
    }

    @Test
    public void maximumSnapshotsRemainReadableWithoutCursorWindowOverflow() {
        String first = "a".repeat(SnapshotDatabase.MAX_VALUE_BYTES);
        String second = "b".repeat(SnapshotDatabase.MAX_VALUE_BYTES);
        store.write("www", first);
        store.write("www", second);
        assertArrayEquals(new String[] { second, first }, store.read("www"));
    }
}
