import { describe, expect, it } from "vitest";

import { createDefaultSettings } from "./setup";
import type { WordEntry } from "./types";
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
