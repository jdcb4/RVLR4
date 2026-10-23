import { describe, expect, it } from "vitest";

import { type DifficultyRating, isDifficultyAllowed } from "@/data/difficulty";
import { getCatalogueForGame } from "@/data/wordCatalogue";

import { createDefaultSettings } from "./setup";
import type { WordEntry } from "./types";
import { getWhoWhatWhereWordList } from "./wordList";
import { buildTurnDeck, chooseWeightedCategory } from "./words";

describe("word selection", () => {
  it("weights What at double the selected category weight", () => {
    expect(chooseWeightedCategory(["What", "Who", "Where"], () => 0)).toBe("What");
    expect(chooseWeightedCategory(["What", "Who", "Where"], () => 0.49)).toBe("What");
    expect(chooseWeightedCategory(["What", "Who", "Where"], () => 0.51)).toBe("Who");
    expect(chooseWeightedCategory(["What", "Who", "Where"], () => 0.99)).toBe("Where");
  });

  it("filters selected categories and preserves hints", () => {
    const words: WordEntry[] = Array.from({ length: 35 }, (_, index) => ({
      word: `Where ${index}`,
      category: "Where",
      hint: `Hint ${index}`,
    }));
    const settings = {
      ...createDefaultSettings(),
      selectedCategories: ["Where"] as const,
    };
    const deck = buildTurnDeck(words, settings, () => 0);
    expect(deck.category).toBe("Where");
    expect(deck.words).toHaveLength(30);
    expect(deck.reserveWords).toHaveLength(5);
    expect(deck.words[0]?.hint).toMatch(/^Hint /);
  });

  it("chooses only selected categories that still contain matching words", () => {
    const words: WordEntry[] = [{ word: "Park", category: "Where", hint: "Outside" }];
    const deck = buildTurnDeck(words, createDefaultSettings(), () => 0);
    expect(deck.category).toBe("Where");
    expect(deck.words).toEqual(words);
  });

  it("reports an empty filtered pool without using other categories", () => {
    const words: WordEntry[] = [{ word: "Park", category: "Where", hint: "Outside" }];
    expect(() =>
      buildTurnDeck(words, { ...createDefaultSettings(), selectedCategories: ["Who"] }),
    ).toThrow("No words match these categories and word settings");
    expect(() => chooseWeightedCategory([])).toThrow("No words match");
  });
});

describe("WWW mixed difficulty turn deck", () => {
  it.each(["easy", "medium", "hard", "all"] as const)(
    "balances the initial 30 and full 90 %s clues after choosing a category",
    (wordDifficulty) => {
      const ratedWords = (["easy", "medium", "hard"] as const).flatMap((difficulty, tier) =>
        Array.from({ length: (tier + 1) * 100 }, (_, index) => ({
          word: `${difficulty}-${index}`,
          difficulty,
          category: "What" as const,
          hint: "Hint",
        })),
      );
      const ratings = new Map(ratedWords.map((entry) => [entry.word, entry.difficulty]));
      const deck = buildTurnDeck(
        [...ratedWords, { word: "Other", category: "Who", hint: "Hint", difficulty: "easy" }],
        { ...createDefaultSettings(), wordDifficulty, selectedCategories: ["What"] },
        () => 0,
      );
      const allowed = (["easy", "medium", "hard"] as const).filter((rating) =>
        isDifficultyAllowed(rating, wordDifficulty),
      );
      for (const words of [deck.words, [...deck.words, ...deck.reserveWords]]) {
        expect(new Set(words.map((word) => word.word)).size).toBe(words.length);
        for (const rating of allowed) {
          expect(words.filter((entry) => ratings.get(entry.word) === rating)).toHaveLength(
            words.length / allowed.length,
          );
        }
        expect(words.every((entry) => entry.category === "What")).toBe(true);
        expect(
          words.every((entry) => Object.keys(entry).sort().join() === "category,hint,word"),
        ).toBe(true);
      }
    },
  );

  it("keeps real catalogue draws easy in Simple mode despite a Hard game setting", () => {
    const options = { difficulty: "hard", simpleMode: true } as const;
    const pool = getWhoWhatWhereWordList();
    const entries = getCatalogueForGame("www", options);
    const byWord = new Map(entries.map((entry) => [entry.word, entry]));
    const deck = buildTurnDeck(
      pool,
      {
        ...createDefaultSettings(),
        simpleMode: true,
        wordDifficulty: "hard",
        selectedCategories: ["What"],
      },
      () => 0,
    );
    const words = [...deck.words, ...deck.reserveWords];
    expect(words).toHaveLength(90);
    expect(words.every((entry) => byWord.get(entry.word)?.difficulty === "easy")).toBe(true);
    expect(words.every((entry) => entry.category === "What")).toBe(true);
    const counts = (list: readonly WordEntry[], rating: DifficultyRating) =>
      list.filter((entry) => byWord.get(entry.word)?.difficulty === rating).length;
    expect(counts(deck.words, "easy")).toBeGreaterThan(0);
    expect(counts(deck.words, "medium")).toBe(0);
    expect(counts(deck.words, "hard")).toBe(0);
    expect(new Set(words.map((entry) => entry.word)).size).toBe(words.length);
  });

  it("returns a short unique deck when a category cannot fill 90 clues", () => {
    const words = [
      { word: "Easy", difficulty: "easy" as const, category: "Where" as const, hint: "Hint" },
      { word: "Hard", difficulty: "hard" as const, category: "Where" as const, hint: "Hint" },
    ];
    const deck = buildTurnDeck(
      words,
      { ...createDefaultSettings(), wordDifficulty: "medium" },
      () => 0,
    );
    expect(deck.words.map((word) => word.word)).toEqual(["Easy"]);
    expect(deck.reserveWords).toEqual([]);
  });
});
