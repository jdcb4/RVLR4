package au.joed.rvlry;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.database.sqlite.SQLiteStatement;
import java.nio.charset.StandardCharsets;

/** Opaque snapshots only; schema validation and recovery belong to the TypeScript store. */
final class SnapshotDatabase extends SQLiteOpenHelper {
    static final int MAX_VALUE_BYTES = 1024 * 1024;

    SnapshotDatabase(Context context) {
        this(context, "rvlry-snapshots.db");
    }

    SnapshotDatabase(Context context, String name) {
        super(context, name, null, 1);
        setWriteAheadLoggingEnabled(false);
    }

    @Override
    public void onConfigure(SQLiteDatabase db) {
        // A successful bridge acknowledgement follows a FULL synchronous commit.
        db.execSQL("PRAGMA synchronous=FULL");
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE snapshots (snapshot_key TEXT PRIMARY KEY NOT NULL, current TEXT NOT NULL, previous TEXT)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        // Never silently erase a database created by another app version.
        throw new IllegalStateException("Unsupported snapshot database version");
    }

    static void validateKey(String key) {
        if (key == null || !key.matches("[A-Za-z0-9._:-]{1,128}")) {
            throw new IllegalArgumentException("Snapshot key must contain 1–128 ASCII letters, digits, dots, underscores, colons or hyphens");
        }
    }

    static void validateValue(String value) {
        if (value == null || value.length() > MAX_VALUE_BYTES || value.getBytes(StandardCharsets.UTF_8).length > MAX_VALUE_BYTES) {
            throw new IllegalArgumentException("Snapshot value must be a string of at most 1 MiB UTF-8");
        }
    }

    synchronized String[] read(String key) {
        validateKey(key);
        SQLiteDatabase db = getReadableDatabase();
        db.beginTransaction();
        try {
            // Read columns separately so two maximum-sized snapshots fit CursorWindow limits.
            String current = readColumn(db, key, "current");
            String previous = readColumn(db, key, "previous");
            db.setTransactionSuccessful();
            return new String[] { current, previous };
        } finally {
            db.endTransaction();
        }
    }

    private String readColumn(SQLiteDatabase db, String key, String column) {
        try (Cursor cursor = db.query("snapshots", new String[] { column }, "snapshot_key = ?", new String[] { key }, null, null, null)) {
            return cursor.moveToFirst() && !cursor.isNull(0) ? cursor.getString(0) : null;
        }
    }

    synchronized void write(String key, String value) {
        validateKey(key);
        validateValue(value);
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            // Compatible with the SQLite version shipped on the minimum supported Android API.
            db.execSQL("INSERT OR IGNORE INTO snapshots(snapshot_key, current, previous) VALUES (?, ?, NULL)", new Object[] { key, value });
            // A first write has no previous checkpoint; a replacement rotates both atomically.
            try (SQLiteStatement changes = db.compileStatement("SELECT changes()")) {
                if (changes.simpleQueryForLong() == 0) {
                    db.execSQL("UPDATE snapshots SET previous = current, current = ? WHERE snapshot_key = ?", new Object[] { value, key });
                }
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    synchronized void remove(String key) {
        validateKey(key);
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            db.delete("snapshots", "snapshot_key = ?", new String[] { key });
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }
}
