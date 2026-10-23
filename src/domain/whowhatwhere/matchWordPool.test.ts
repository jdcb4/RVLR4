import { describe, expect, it } from "vitest";

import {
  captureMatchWordPool,
  MATCH_WORD_POOL_MAX_BYTES,
  MATCH_WORD_POOL_MAX_ENTRIES,
  type MatchPoolWord,
  matchWordPoolSchema,
} from "./matchWordPool";
import { createDefaultSettings } from "./setup";
import { getWhoWhatWhereWordList } from "./wordList";

describe("captured WWW match word pool", () => {
  it("samples every selected category and allowed difficulty without changing its inputs", () => {
    const settings = { ...createDefaultSettings(), wordDifficulty: "medium" as const };
    const words = getWhoWhatWhereWordList({ difficulty: "medium", kidsMode: true });
    const before = JSON.stringify(words);
    const pool = captureMatchWordPool(words, settings, () => 0.5);
    expect(matchWordPoolSchema.safeParse(pool).success).toBe(true);
    expect(pool.length).toBeLessThanOrEqual(90 * settings.teamCount * settings.totalRounds);
    expect(new Set(pool.map(({ word }) => word)).size).toBe(pool.length);
    expect(new Set(pool.map(({ category }) => category))).toEqual(
      new Set(settings.selectedCategories),
    );
    for (const category of settings.selectedCategories) {
      const easy = pool.filter((word) => word.category === category && word.difficulty === "easy");
      const medium = pool.filter(
        (word) => word.category === category && word.difficulty === "medium",
      );
      const stock = words.filter((word) => word.category === category);
      if (Math.abs(easy.length - medium.length) > 1) {
        expect(
          easy.length === stock.filter((word) => word.difficulty === "easy").length ||
            medium.length === stock.filter((word) => word.difficulty === "medium").length,
        ).toBe(true);
      }
    }
    expect(pool.every((word) => word.difficulty !== "hard")).toBe(true);
    expect(JSON.stringify(words)).toBe(before);
    expect(pool.every((word) => !words.includes(word))).toBe(true);
  });

  it("bounds large Unicode packs by UTF8 bytes and count while retaining every category", () => {
    const words: MatchPoolWord[] = Array.from({ length: 5_000 }, (_, index) => ({
      word: `Long clue ${index} ${"😀".repeat(25)}`,
      category: (["Who", "What", "Where"] as const)[index % 3]!,
      hint: "😀".repeat(120),
      difficulty: (["easy", "medium", "hard"] as const)[Math.floor(index / 3) % 3]!,
    }));
    const settings = { ...createDefaultSettings(), teamCount: 4 as const, totalRounds: 4 as const };
    const pool = captureMatchWordPool(words, settings, () => 0.5);
    expect(pool.length).toBeLessThan(MATCH_WORD_POOL_MAX_ENTRIES);
    expect(new TextEncoder().encode(JSON.stringify(pool)).byteLength).toBeLessThanOrEqual(
      MATCH_WORD_POOL_MAX_BYTES,
    );
    expect(matchWordPoolSchema.safeParse(pool).success).toBe(true);
    expect(new Set(pool.map(({ category }) => category))).toEqual(
      new Set(settings.selectedCategories),
    );
    expect(new Set(pool.map(({ difficulty }) => difficulty))).toEqual(
      new Set(["easy", "medium", "hard"]),
    );
  });

  it("retains a full turn's stock in every category even for a two-turn match", () => {
    const words: MatchPoolWord[] = Array.from({ length: 900 }, (_, index) => ({
      word: `Clue ${index}`,
      category: (["Who", "What", "Where"] as const)[index % 3]!,
      hint: "Hint",
      difficulty: "easy",
    }));
    const settings = { ...createDefaultSettings(), teamCount: 2 as const, totalRounds: 1 as const };
    const pool = captureMatchWordPool(words, settings, () => 0.5);
    for (const category of settings.selectedCategories) {
      expect(pool.filter((word) => word.category === category)).toHaveLength(90);
    }
  });

  it("caps short packs by count and excludes unselected categories and tiers", () => {
    const words: MatchPoolWord[] = Array.from({ length: 3_000 }, (_, index) => ({
      word: `Clue ${index}`,
      category: "What",
      hint: "Hint",
      difficulty: "easy",
    }));
    const settings = {
      ...createDefaultSettings(),
      teamCount: 4 as const,
      totalRounds: 4 as const,
      selectedCategories: ["What" as const],
      wordDifficulty: "easy" as const,
    };
    expect(captureMatchWordPool(words, settings, () => 0.5)).toHaveLength(
      MATCH_WORD_POOL_MAX_ENTRIES,
    );
    expect(captureMatchWordPool(words, { ...settings, selectedCategories: ["Who"] })).toEqual([]);
    expect(
      captureMatchWordPool(
        words.map((word) => ({ ...word, difficulty: "hard" })),
        settings,
      ),
    ).toEqual([]);
  });
});
