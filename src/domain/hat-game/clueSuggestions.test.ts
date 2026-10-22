import { describe, expect, it } from "vitest";

import { getCatalogueForGame } from "@/data/wordCatalogue";
import { getHatClueSuggestions } from "@/domain/hat-game/clueSuggestions";

describe("Hat suggestion content pools", () => {
  it("keeps the complete default pool and projects only suitable entries in kids mode", () => {
    const all = getHatClueSuggestions();
    const kids = getHatClueSuggestions({ kidsMode: true });
    expect(all).toEqual(getCatalogueForGame("hat").map(({ word }) => word));
    expect(kids).toEqual(getCatalogueForGame("hat", { kidsMode: true }).map(({ word }) => word));
    expect(kids.length).toBeGreaterThan(0);
    expect(kids.length).toBeLessThan(all.length);
    expect(
      getCatalogueForGame("hat", { kidsMode: true }).every((entry) => entry.kidAppropriate),
    ).toBe(true);
  });

  it("accepts catalogue options without introducing a Hat difficulty setting", () => {
    expect(getHatClueSuggestions({ difficulty: "easy", kidsMode: true })).toEqual(
      getCatalogueForGame("hat", { difficulty: "easy", kidsMode: true }).map(({ word }) => word),
    );
  });
});
