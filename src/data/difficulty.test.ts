import { describe, expect, it } from "vitest";

import { type DifficultyRating, isDifficultyAllowed, selectDifficultyBalanced } from "./difficulty";

function pool(easy: number, medium: number, hard: number) {
  return (["easy", "medium", "hard"] as const).flatMap((difficulty, index) =>
    Array.from({ length: [easy, medium, hard][index]! }, (_, word) => ({
      word: `${difficulty}-${word}`,
      difficulty,
    })),
  );
}

function counts(entries: readonly { difficulty: DifficultyRating }[]) {
  return ["easy", "medium", "hard"].map(
    (difficulty) => entries.filter((entry) => entry.difficulty === difficulty).length,
  );
}

describe("mixed difficulty selection", () => {
  it("allows only tiers at or below the selected level, including the legacy All alias", () => {
    for (const mode of [undefined, "all", "easy", "medium", "hard"] as const) {
      expect(pool(1, 1, 1).filter((entry) => isDifficultyAllowed(entry.difficulty, mode))).toEqual(
        pool(1, mode === "easy" ? 0 : 1, mode === "easy" || mode === "medium" ? 0 : 1),
      );
    }
  });

  it("balances actual prefixes regardless of tier pool sizes", () => {
    const entries = pool(100, 200, 300);
    for (const [mode, expected] of [
      ["easy", [30, 0, 0]],
      ["medium", [15, 15, 0]],
      ["hard", [10, 10, 10]],
      ["all", [10, 10, 10]],
    ] as const) {
      const selected = selectDifficultyBalanced(entries, 90, mode, () => 0);
      expect(counts(selected.slice(0, 30))).toEqual(expected);
      expect(counts(selected)).toEqual(expected.map((count) => count * 3));
      expect(new Set(selected).size).toBe(90);
    }
    expect(counts(selectDifficultyBalanced(entries, 31, "hard", () => 0))).toEqual([11, 10, 10]);
  });

  it("redistributes shortages only among allowed tiers without expanding duplicates", () => {
    const entries = pool(2, 12, 30);
    expect(counts(selectDifficultyBalanced(entries, 12, "hard", () => 0))).toEqual([2, 5, 5]);
    const medium = selectDifficultyBalanced(entries, 100, "medium", () => 0);
    expect(counts(medium)).toEqual([2, 12, 0]);
    expect(new Set(medium.map((entry) => entry.word)).size).toBe(14);
    const easy = entries[0]!;
    expect(selectDifficultyBalanced([easy, easy], 10, "easy", () => 0)).toEqual([easy]);
    expect(selectDifficultyBalanced(pool(0, 0, 3), 10, "medium", () => 0)).toEqual([]);
    expect(selectDifficultyBalanced(entries, 0, "hard", () => 0)).toEqual([]);
  });

  it("selects a single tier uniformly before choosing one of its words", () => {
    const entries = pool(2, 20, 200);
    const selected = Array.from({ length: 300 }, (_, draw) => {
      const random = [((draw % 3) + 0.5) / 3, 0.5];
      return selectDifficultyBalanced(entries, 1, "hard", () => random.shift()!)[0]!;
    });
    expect(counts(selected)).toEqual([100, 100, 100]);
    const withoutHard = pool(2, 20, 0);
    expect(selectDifficultyBalanced(withoutHard, 1, "hard", () => 0.75)[0]?.difficulty).toBe(
      "medium",
    );
  });

  it("keeps categories secondary to the difficulty mix and supplied RNG repeatable", () => {
    const entries = pool(30, 30, 30).map((entry, index) => ({
      ...entry,
      category: index % 2 === 0 ? "a" : "b",
    }));
    const select = () =>
      selectDifficultyBalanced(
        entries,
        30,
        "hard",
        () => 0,
        (entry) => entry.category,
      );
    expect(select()).toEqual(select());
    expect(counts(select())).toEqual([10, 10, 10]);
    expect(select().filter((entry) => entry.category === "a")).toHaveLength(15);
  });
});
