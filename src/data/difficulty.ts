export type DifficultyRating = "easy" | "medium" | "hard";
type DifficultyMode = "all" | DifficultyRating | undefined;

const RATINGS: readonly DifficultyRating[] = ["easy", "medium", "hard"];

/** Legacy All and omitted modes use the same three-tier mix as Hard. */
export function isDifficultyAllowed(rating: DifficultyRating, mode: DifficultyMode): boolean {
  return mode === "easy" ? rating === "easy" : mode === "medium" ? rating !== "hard" : true;
}

/**
 * Balance every draw prefix across available allowed tiers, without repeating entries.
 * Exhausted tiers give their remaining share to the other allowed tiers. Category
 * balance, when requested, is secondary to the difficulty mix.
 */
export function selectDifficultyBalanced<T extends { difficulty: DifficultyRating }>(
  entries: readonly T[],
  count: number,
  mode: DifficultyMode,
  rng: () => number = Math.random,
  categoryKey?: (entry: T) => string,
): T[] {
  const uniqueEntries = [...new Set(entries)];
  const buckets = RATINGS.filter((rating) => isDifficultyAllowed(rating, mode)).map((rating) => ({
    entries: uniqueEntries.filter((entry) => entry.difficulty === rating),
    selected: 0,
  }));
  const result: T[] = [];
  const categoryCounts = new Map<string, number>();
  const limit = Math.min(uniqueEntries.length, Math.max(0, Math.trunc(count)));

  while (result.length < limit) {
    const available = buckets.filter((bucket) => bucket.entries.length > 0);
    if (!available.length) break;
    const minimum = Math.min(...available.map((bucket) => bucket.selected));
    const candidates = available.filter((bucket) => bucket.selected === minimum);
    const bucket = candidates[Math.floor(rng() * candidates.length)]!;
    let wordCandidates = bucket.entries;
    if (categoryKey) {
      const categories = [...new Set(bucket.entries.map(categoryKey))];
      const minimumCategoryCount = Math.min(
        ...categories.map((category) => categoryCounts.get(category) ?? 0),
      );
      const leastUsed = categories.filter(
        (category) => (categoryCounts.get(category) ?? 0) === minimumCategoryCount,
      );
      const category = leastUsed[Math.floor(rng() * leastUsed.length)]!;
      wordCandidates = bucket.entries.filter((entry) => categoryKey(entry) === category);
    }
    const entry = wordCandidates[Math.floor(rng() * wordCandidates.length)]!;
    bucket.entries.splice(bucket.entries.indexOf(entry), 1);
    bucket.selected += 1;
    result.push(entry);
    if (categoryKey) {
      const category = categoryKey(entry);
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  }
  return result;
}
