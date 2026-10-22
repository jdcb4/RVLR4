import { describe, expect, it } from "vitest";

import { isDifficultyAllowed } from "@/data/difficulty";
import { getCatalogueForGame } from "@/data/wordCatalogue";

import { chooseImposterWord, getImposterWordList } from "./wordList";

describe("Imposter difficulty selection", () => {
  it.each(["easy", "medium", "hard", "all"] as const)(
    "uses equal tier probability for %s despite unequal catalogue sizes",
    (difficulty) => {
      const pool = getCatalogueForGame("imposter", { difficulty });
      const byWord = new Map(pool.map((entry) => [entry.word, entry]));
      const tiers = (["easy", "medium", "hard"] as const).filter(
        (rating) =>
          isDifficultyAllowed(rating, difficulty) &&
          pool.some((entry) => entry.difficulty === rating),
      );
      expect(getImposterWordList({ difficulty })).toEqual(pool.map((entry) => entry.word));
      const counts = new Map(tiers.map((rating) => [rating, 0]));
      for (let draw = 0; draw < 300; draw += 1) {
        const random = [((draw % tiers.length) + 0.5) / tiers.length, 0.5];
        const word = chooseImposterWord({ difficulty }, () => random.shift()!);
        const rating = byWord.get(word!)!.difficulty;
        counts.set(rating, counts.get(rating)! + 1);
      }
      expect([...counts.values()]).toEqual(tiers.map(() => 300 / tiers.length));
    },
  );

  it("fills missing Hard Kids stock from suitable easy and medium tiers", () => {
    const options = { difficulty: "hard", kidsMode: true } as const;
    const pool = getCatalogueForGame("imposter", options);
    expect(pool.some((entry) => entry.difficulty === "hard")).toBe(false);
    const chosen = [0.25, 0.75].map((tierRandom) => {
      const random = [tierRandom, 0.5];
      const word = chooseImposterWord(options, () => random.shift()!);
      return pool.find((entry) => entry.word === word)!;
    });
    expect(chosen.map((entry) => entry.difficulty)).toEqual(["easy", "medium"]);
    expect(chosen.every((entry) => entry.kidAppropriate)).toBe(true);
  });

  it("honours the supplied RNG for word selection without repeating or padding the word bank", () => {
    const pool = getCatalogueForGame("imposter", { difficulty: "easy" });
    expect(chooseImposterWord({ difficulty: "easy" }, () => 0)).toBe(pool[0]?.word);
    expect(chooseImposterWord({ difficulty: "easy" }, () => 0.999999)).toBe(pool.at(-1)?.word);
    const words = getImposterWordList();
    expect(new Set(words).size).toBe(words.length);
  });
});
