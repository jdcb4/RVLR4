import { describe, expect, it } from "vitest";

import { getCatalogueForGame } from "@/data/wordCatalogue";
import { getHatClueSuggestions } from "@/domain/hat-game/clueSuggestions";

describe("Hat suggestion content pools", () => {
  it("keeps the complete default pool and offers only easy entries in Simple mode", () => {
    const all = getHatClueSuggestions();
    const kids = getHatClueSuggestions({ simpleMode: true });
    expect(all).toEqual(getCatalogueForGame("hat").map(({ word }) => word));
    expect(kids).toEqual(getCatalogueForGame("hat", { simpleMode: true }).map(({ word }) => word));
    expect(kids.length).toBeGreaterThan(0);
    expect(kids.length).toBeLessThan(all.length);
    expect(
      getCatalogueForGame("hat", { simpleMode: true }).every(
        (entry) => entry.difficulty === "easy",
      ),
    ).toBe(true);
  });

  it("accepts catalogue options without introducing a Hat difficulty setting", () => {
    expect(getHatClueSuggestions({ difficulty: "easy", simpleMode: true })).toEqual(
      getCatalogueForGame("hat", { difficulty: "easy", simpleMode: true }).map(({ word }) => word),
    );
  });
});
