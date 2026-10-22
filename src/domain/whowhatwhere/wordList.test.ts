import { describe, expect, it } from "vitest";

import { getCatalogueForGame } from "@/data/wordCatalogue";

import { getWhoWhatWhereWordList } from "./wordList";

describe("WWW word pool adapter", () => {
  it("retains the full default pool and existing snapshot word shape", () => {
    expect(getWhoWhatWhereWordList()).toEqual(
      getCatalogueForGame("www").map(({ word, category, hint }) => ({ word, category, hint })),
    );
  });

  it.each(["all", "easy", "medium", "hard"] as const)(
    "projects exact %s difficulty and Kids mode filters",
    (difficulty) => {
      for (const kidsMode of [false, true]) {
        const options = { difficulty, kidsMode };
        const expected = getCatalogueForGame("www", options);
        expect(getWhoWhatWhereWordList(options)).toEqual(
          expected.map(({ word, category, hint }) => ({ word, category, hint })),
        );
        expect(expected.length).toBeGreaterThan(0);
        expect(expected.every((entry) => !kidsMode || entry.kidAppropriate)).toBe(true);
        expect(
          expected.every((entry) => difficulty === "all" || entry.difficulty === difficulty),
        ).toBe(true);
      }
    },
  );
});
