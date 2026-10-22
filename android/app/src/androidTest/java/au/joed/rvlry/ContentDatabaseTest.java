package au.joed.rvlry;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteException;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.nio.charset.StandardCharsets;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class ContentDatabaseTest {
    private static final String NAME = "content-instrumentation-test.db";
    private Context context;
    private ContentDatabase store;

    private static String pack(String kind, long version) {
        return "{\"schemaVersion\":1,\"kind\":\"" + kind + "\",\"version\":" + version + ",\"entries\":[]}";
    }

    @Before
    public void setUp() {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        context.deleteDatabase(NAME);
        store = new ContentDatabase(context, NAME);
    }

    @After
    public void tearDown() {
        store.close();
        context.deleteDatabase(NAME);
    }

    @Test
    public void committedPacksRotateAtomicallyAndSurviveReopen() {
        String first = pack("trivia", 1);
        String second = pack("trivia", 2);
        String third = pack("trivia", 3);
        assertArrayEquals(new String[] { null, null }, store.read("trivia"));
        store.install("trivia", first, null);
        assertArrayEquals(new String[] { first, null }, store.read("trivia"));
        store.install("trivia", second, first);
        store.install("trivia", third, second);
        store.close();
        store = new ContentDatabase(context, NAME);
        assertArrayEquals(new String[] { third, second }, store.read("trivia"));
        try (Cursor cursor = store.getReadableDatabase().rawQuery("PRAGMA synchronous", null)) {
            cursor.moveToFirst();
            assertEquals(2, cursor.getInt(0));
        }
    }

    @Test
    public void failedInstallRollsBackDeletedAndPartiallyWrittenChunks() {
        String first = pack("trivia", 1);
        String second = pack("trivia", 2);
        store.install("trivia", first, null);
        store.install("trivia", second, first);
        store.getWritableDatabase().execSQL("CREATE TRIGGER fail_content_insert BEFORE INSERT ON content_chunks WHEN NEW.slot = 1 BEGIN SELECT RAISE(ABORT, 'test failure'); END");
        assertThrows(SQLiteException.class, () -> store.install("trivia", pack("trivia", 3), second));
        store.close();
        store = new ContentDatabase(context, NAME);
        assertArrayEquals(new String[] { second, first }, store.read("trivia"));
    }

    @Test
    public void kindsAndGameSnapshotsRemainIndependent() {
        String trivia = pack("trivia", 1);
        String words = pack("words", 1);
        String snapshotName = "content-isolation-snapshots-test.db";
        context.deleteDatabase(snapshotName);
        try (SnapshotDatabase snapshots = new SnapshotDatabase(context, snapshotName)) {
            snapshots.write("whowhatwhere.device-session.v1", "game remains intact");
            store.install("trivia", trivia, null);
            store.install("words", words, null);
            store.install("trivia", pack("trivia", 2), trivia);
            assertArrayEquals(new String[] { words, null }, store.read("words"));
            assertArrayEquals(new String[] { "game remains intact", null }, snapshots.read("whowhatwhere.device-session.v1"));
        } finally {
            context.deleteDatabase(snapshotName);
        }
    }

    @Test
    public void invalidEnvelopeVersionOrSizeLeavesBothCheckpointsUntouched() {
        String first = pack("trivia", 1);
        String second = pack("trivia", 2);
        store.install("trivia", first, null);
        store.install("trivia", second, first);
        for (String invalid : new String[] {
            null, "not JSON", pack("words", 3), pack("trivia", 0), first, second,
            "{\"schemaVersion\":2,\"kind\":\"trivia\",\"version\":3}",
            "{\"schemaVersion\":\"1\",\"kind\":\"trivia\",\"version\":3}",
            "{\"schemaVersion\":1,\"kind\":\"trivia\",\"version\":\"3\"}",
            "{\"schemaVersion\":1,\"kind\":\"trivia\",\"version\":3.5}",
            pack("trivia", 9007199254740992L),
            "é".repeat(ContentDatabase.MAX_VALUE_BYTES / 2 + 1)
        }) {
            assertThrows(IllegalArgumentException.class, () -> store.install("trivia", invalid, second));
            assertArrayEquals(new String[] { second, first }, store.read("trivia"));
        }
        assertThrows(IllegalArgumentException.class, () -> store.read("../trivia"));
        assertThrows(IllegalArgumentException.class, () -> store.install("other", pack("trivia", 3), null));
    }

    @Test
    public void staleCompareAndSwapCannotOverwriteAnotherConnection() {
        String first = pack("trivia", 1);
        String second = pack("trivia", 2);
        store.install("trivia", first, null);
        try (ContentDatabase another = new ContentDatabase(context, NAME)) {
            String stale = another.read("trivia")[0];
            store.install("trivia", second, first);
            assertThrows(ContentDatabase.ConflictException.class, () -> another.install("trivia", pack("trivia", 3), stale));
            assertThrows(ContentDatabase.ConflictException.class, () -> another.install("trivia", pack("trivia", 3), null));
            assertArrayEquals(new String[] { second, first }, another.read("trivia"));
        }
    }

    @Test
    public void recoveryCanRetainGoodPreviousInsteadOfCorruptCurrent() {
        String first = pack("trivia", 1);
        String second = pack("trivia", 2);
        store.install("trivia", first, null);
        store.install("trivia", second, first);
        String corrupt = "corrupt current";
        store.getWritableDatabase().execSQL("UPDATE content_chunks SET value = ? WHERE kind = 'trivia' AND slot = 0", new Object[] { corrupt.getBytes(StandardCharsets.UTF_8) });
        assertThrows(IllegalArgumentException.class, () -> store.install("trivia", pack("trivia", 3), corrupt, "uninstalled"));
        assertThrows(IllegalArgumentException.class, () -> store.install("trivia", first, corrupt, first));
        store.install("trivia", pack("trivia", 3), corrupt, first);
        assertArrayEquals(new String[] { pack("trivia", 3), first }, store.read("trivia"));
        store.install("trivia", pack("trivia", 4), pack("trivia", 3), null);
        assertArrayEquals(new String[] { pack("trivia", 4), null }, store.read("trivia"));
    }

    @Test
    public void maximumMultibytePacksRoundtripThroughBoundedChunks() {
        String header = "{\"schemaVersion\":1,\"kind\":\"trivia\",\"version\":1,\"padding\":\"";
        int remaining = ContentDatabase.MAX_VALUE_BYTES - header.length() - 2;
        String first = header + "€".repeat(remaining / 3) + "x".repeat(remaining % 3) + "\"}";
        String second = first.replace("\"version\":1", "\"version\":2");
        assertEquals(ContentDatabase.MAX_VALUE_BYTES, first.getBytes(StandardCharsets.UTF_8).length);
        store.install("trivia", first, null);
        store.install("trivia", second, first);
        store.close();
        store = new ContentDatabase(context, NAME);
        assertArrayEquals(new String[] { second, first }, store.read("trivia"));
        try (Cursor cursor = store.getReadableDatabase().rawQuery("SELECT MAX(length(value)), COUNT(*) FROM content_chunks", null)) {
            cursor.moveToFirst();
            assertEquals(ContentDatabase.CHUNK_BYTES, cursor.getInt(0));
            assertEquals(64, cursor.getInt(1));
        }
    }
}
