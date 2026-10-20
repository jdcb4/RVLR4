package au.joed.rvlry;

import static org.junit.Assert.assertThrows;
import org.junit.Test;

public class SnapshotValidationTest {
    @Test
    public void rejectsInvalidKeys() {
        for (String key : new String[] { null, "", "../save", "a b", "x".repeat(129) }) {
            assertThrows(IllegalArgumentException.class, () -> SnapshotDatabase.validateKey(key));
        }
        SnapshotDatabase.validateKey("rvlry.www:session-v1");
    }

    @Test
    public void enforcesUtf8SizeRatherThanOnlyStringLength() {
        SnapshotDatabase.validateValue("x".repeat(SnapshotDatabase.MAX_VALUE_BYTES));
        assertThrows(IllegalArgumentException.class, () -> SnapshotDatabase.validateValue(null));
        assertThrows(IllegalArgumentException.class, () -> SnapshotDatabase.validateValue("é".repeat(SnapshotDatabase.MAX_VALUE_BYTES / 2 + 1)));
    }
}
