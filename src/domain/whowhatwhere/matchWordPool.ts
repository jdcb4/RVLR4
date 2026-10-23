import { z } from "zod";

import { type DifficultyRating, selectDifficultyBalanced } from "@/data/difficulty";

import { CATEGORIES, type GameSettings, type WordEntry } from "./types";

export type MatchPoolWord = WordEntry & { readonly difficulty: DifficultyRating };

export const MATCH_WORD_POOL_MAX_ENTRIES = 1_440;
export const MATCH_WORD_POOL_MAX_BYTES = 350 * 1024;
const utf8 = new TextEncoder();

export const matchWordPoolSchema = z
  .array(
    z
      .object({
        word: z.string().min(1).max(80),
        category: z.enum(CATEGORIES),
        hint: z
          .string()
          .max(240)
          .refine((hint) => hint.trim().length > 0),
        difficulty: z.enum(["easy", "medium", "hard"]),
      })
      .strict(),
  )
  .max(MATCH_WORD_POOL_MAX_ENTRIES)
  .refine(
    (words) => utf8.encode(JSON.stringify(words)).byteLength <= MATCH_WORD_POOL_MAX_BYTES,
    "The match word pool exceeds its storage budget.",
  );

/** Freeze a bounded sample so later catalogue updates cannot change a running match. */
export function captureMatchWordPool(
  words: readonly MatchPoolWord[],
  settings: GameSettings,
  random = Math.random,
): readonly MatchPoolWord[] {
  const categories = [...new Set(settings.selectedCategories)];
  // Even a two-turn match can draw any selected category's full 90-word deck.
  const limit = Math.min(
    MATCH_WORD_POOL_MAX_ENTRIES,
    90 * Math.max(settings.teamCount * settings.totalRounds, categories.length),
  );
  const buckets = categories.map((category) =>
    selectDifficultyBalanced(
      words.filter((word) => word.category === category),
      limit,
      settings.wordDifficulty,
      random,
    ),
  );
  const pool: MatchPoolWord[] = [];
  let bytes = 2; // JSON array brackets.
  for (let index = 0; pool.length < limit; index += 1) {
    let remaining = false;
    for (const bucket of buckets) {
      const candidate = bucket[index];
      if (!candidate || pool.length === limit) continue;
      remaining = true;
      const { word, category, hint, difficulty } = candidate;
      const copy = { word, category, hint, difficulty };
      const size = utf8.encode(JSON.stringify(copy)).byteLength + (pool.length ? 1 : 0);
      if (bytes + size > MATCH_WORD_POOL_MAX_BYTES) continue;
      pool.push(copy);
      bytes += size;
    }
    if (!remaining) break;
  }
  return pool;
}
