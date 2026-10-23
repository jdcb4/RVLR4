import { describe, expect, it } from "vitest";

import { isDifficultyAllowed } from "@/data/difficulty";
import { getCatalogueForGame } from "@/data/wordCatalogue";

import { getWhoWhatWhereWordList } from "./wordList";

describe("WWW word pool adapter", () => {
  it("retains full default pool ratings until the turn deck is selected", () => {
    expect(getWhoWhatWhereWordList()).toEqual(
      getCatalogueForGame("www").map(({ word, category, hint, difficulty }) => ({
        word,
        category,
        hint,
        difficulty,
      })),
    );
  });

  it.each(["all", "easy", "medium", "hard"] as const)(
    "projects allowed %s tiers and Simple mode filters",
    (difficulty) => {
      for (const simpleMode of [false, true]) {
        const options = { difficulty, simpleMode };
        const expected = getCatalogueForGame("www", options);
        expect(getWhoWhatWhereWordList(options)).toEqual(
          expected.map(({ word, category, hint, difficulty }) => ({
            word,
            category,
            hint,
            difficulty,
          })),
        );
        expect(expected.length).toBeGreaterThan(0);
        expect(expected.every((entry) => !simpleMode || entry.difficulty === "easy")).toBe(true);
        expect(expected.every((entry) => isDifficultyAllowed(entry.difficulty, difficulty))).toBe(
          true,
        );
      }
    },
  );
});
