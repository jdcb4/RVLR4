package au.joed.rvlry;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Objects;
import org.json.JSONException;
import org.json.JSONObject;

/** Pack bodies are validated by TypeScript; native storage checks the bounded envelope. */
final class ContentDatabase extends SQLiteOpenHelper {
    static final int MAX_VALUE_BYTES = 8 * 1024 * 1024;
    static final int CHUNK_BYTES = 256 * 1024;
    private static final long MAX_SAFE_INTEGER = 9007199254740991L;

    static final class ConflictException extends IllegalStateException {
        ConflictException() {
            super("Installed content changed; reload before installing");
        }
    }

    ContentDatabase(Context context) {
        this(context, "rvlry-content.db");
    }

    ContentDatabase(Context context, String name) {
        super(context, name, null, 1);
        setWriteAheadLoggingEnabled(false);
    }

    @Override
    public void onConfigure(SQLiteDatabase db) {
        db.execSQL("PRAGMA synchronous=FULL");
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        // BLOB chunks keep even maximum-sized current/previous packs below CursorWindow limits.
        db.execSQL("CREATE TABLE content_chunks (kind TEXT NOT NULL, slot INTEGER NOT NULL CHECK(slot IN (0, 1)), chunk_index INTEGER NOT NULL, value BLOB NOT NULL, PRIMARY KEY(kind, slot, chunk_index))");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        throw new IllegalStateException("Unsupported content database version");
    }

    static void validateKind(String kind) {
        if (!"trivia".equals(kind) && !"words".equals(kind)) {
            throw new IllegalArgumentException("Content kind must be trivia or words");
        }
    }

    private static byte[] boundedBytes(String value) {
        if (value == null || value.length() > MAX_VALUE_BYTES) {
            throw new IllegalArgumentException("Content value must be a string of at most 8 MiB UTF-8");
        }
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        if (bytes.length > MAX_VALUE_BYTES) {
            throw new IllegalArgumentException("Content value must be a string of at most 8 MiB UTF-8");
        }
        return bytes;
    }

    static long validateHeader(String kind, String value) {
        validateKind(kind);
        boundedBytes(value);
        try {
            JSONObject header = new JSONObject(value);
            if (safeInteger(header.opt("schemaVersion")) != 1 || !kind.equals(header.opt("kind"))) {
                throw new IllegalArgumentException("Unsupported content envelope");
            }
            long version = safeInteger(header.opt("version"));
            if (version < 1) {
                throw new IllegalArgumentException("Content version must be a positive safe integer");
            }
            return version;
        } catch (JSONException error) {
            throw new IllegalArgumentException("Content must have a valid JSON envelope");
        }
    }

    private static long safeInteger(Object value) {
        if (!(value instanceof Number)) return -1;
        double number = ((Number) value).doubleValue();
        if (!Double.isFinite(number) || number < 0 || number > MAX_SAFE_INTEGER || number != Math.floor(number)) return -1;
        return ((Number) value).longValue();
    }

    private static long knownVersion(String kind, String value) {
        if (value == null) return 0;
        try {
            return validateHeader(kind, value);
        } catch (IllegalArgumentException error) {
            // A corrupt current pack must not prevent replacing it while preserving a good previous pack.
            return 0;
        }
    }

    synchronized String[] read(String kind) {
        validateKind(kind);
        SQLiteDatabase db = getReadableDatabase();
        db.beginTransaction();
        try {
            String[] result = readSlots(db, kind);
            db.setTransactionSuccessful();
            return result;
        } finally {
            db.endTransaction();
        }
    }

    private String[] readSlots(SQLiteDatabase db, String kind) {
        return new String[] { readSlot(db, kind, 0), readSlot(db, kind, 1) };
    }

    private String readSlot(SQLiteDatabase db, String kind, int slot) {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        int nextIndex = 0;
        try (Cursor cursor = db.query("content_chunks", new String[] { "chunk_index", "value" }, "kind = ? AND slot = ?", new String[] { kind, Integer.toString(slot) }, null, null, "chunk_index ASC")) {
            while (cursor.moveToNext()) {
                byte[] chunk = cursor.getBlob(1);
                if (cursor.getInt(0) != nextIndex || chunk == null || chunk.length == 0 || chunk.length > CHUNK_BYTES || output.size() + chunk.length > MAX_VALUE_BYTES) {
                    throw new IllegalStateException("Invalid content storage chunks");
                }
                output.write(chunk, 0, chunk.length);
                nextIndex++;
            }
        }
        return nextIndex == 0 ? null : new String(output.toByteArray(), StandardCharsets.UTF_8);
    }

    synchronized void install(String kind, String value, String expectedCurrent) {
        install(kind, value, expectedCurrent, null, false);
    }

    synchronized void install(String kind, String value, String expectedCurrent, String retainedPrevious) {
        install(kind, value, expectedCurrent, retainedPrevious, true);
    }

    private void install(String kind, String value, String expectedCurrent, String retainedPrevious, boolean retentionSupplied) {
        long version = validateHeader(kind, value);
        byte[] bytes = boundedBytes(value);
        if (expectedCurrent != null) boundedBytes(expectedCurrent);
        if (retainedPrevious != null) boundedBytes(retainedPrevious);
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            String[] installed = readSlots(db, kind);
            if (!Objects.equals(expectedCurrent, installed[0])) throw new ConflictException();
            String previous = retentionSupplied ? retainedPrevious : installed[0];
            if (previous != null && !previous.equals(installed[0]) && !previous.equals(installed[1])) {
                throw new IllegalArgumentException("Retained content must match an installed checkpoint");
            }
            if (version <= Math.max(knownVersion(kind, installed[0]), knownVersion(kind, installed[1]))) {
                throw new IllegalArgumentException("Content version must increase");
            }
            db.delete("content_chunks", "kind = ?", new String[] { kind });
            writeSlot(db, kind, 0, bytes);
            if (previous != null) writeSlot(db, kind, 1, boundedBytes(previous));
            db.setTransactionSuccessful();
        } finally {
            // Acknowledgement only follows the FULL synchronous transaction commit.
            db.endTransaction();
        }
    }

    private void writeSlot(SQLiteDatabase db, String kind, int slot, byte[] bytes) {
        for (int offset = 0, index = 0; offset < bytes.length; offset += CHUNK_BYTES, index++) {
            byte[] chunk = Arrays.copyOfRange(bytes, offset, Math.min(offset + CHUNK_BYTES, bytes.length));
            db.execSQL("INSERT INTO content_chunks(kind, slot, chunk_index, value) VALUES (?, ?, ?, ?)", new Object[] { kind, slot, index, chunk });
        }
    }
}
