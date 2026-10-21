import type { ClueHistoryEntry } from "@/domain/hat-game/types";

/** A replay resolves the skipped occurrence only within the same phase. */
export function hatDeviceRecapHistory(history: readonly ClueHistoryEntry[]) {
  const resolved = new Set<string>();
  const skipped = new Set<string>();
  history.forEach((entry) => {
    const key = `${entry.phaseNumber ?? 1}:${entry.poolIndex}`;
    if (entry.status === "skipped") skipped.add(key);
    else if (skipped.has(key)) resolved.add(key);
  });
  const seenSkips = new Set<string>();
  return history.flatMap((entry) => {
    const key = `${entry.phaseNumber ?? 1}:${entry.poolIndex}`;
    if (entry.status === "skipped") {
      if (resolved.has(key) || seenSkips.has(key)) return [];
      seenSkips.add(key);
    }
    return [{ ...entry, replayed: entry.status === "correct" && resolved.has(key) }];
  });
}
