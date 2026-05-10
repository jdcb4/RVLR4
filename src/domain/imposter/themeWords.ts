/**
 * Theme hook for which words may be drawn from the master list.
 * v1: only the default theme exists (full bank). Future themes may return subsets — no UI yet.
 */

export const DEFAULT_IMPOSTER_THEME_ID = "default";

/**
 * Resolves the word list for a theme id. Unknown ids fall back to the full bank until themes ship.
 */
export function resolveImposterWordBank(
  themeId: string,
  fullWordBank: readonly string[],
): readonly string[] {
  if (
    themeId === DEFAULT_IMPOSTER_THEME_ID ||
    themeId === ""
  ) {
    return fullWordBank;
  }
  // Placeholder for future themed subsets (e.g. places-only pack).
  return fullWordBank;
}
