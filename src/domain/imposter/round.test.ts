import { describe, expect, it } from "vitest";

import {
  clampImposterCount,
  dealImposterRound,
  defaultImposterCount,
  getImposterSetupError,
  maxImpostersForPlayers,
} from "./round";

describe("maxImpostersForPlayers", () => {
  it("caps reasonably for small groups", () => {
    expect(maxImpostersForPlayers(4)).toBe(1);
    expect(maxImpostersForPlayers(5)).toBe(2);
    expect(maxImpostersForPlayers(6)).toBe(2);
  });

  it("never exceeds 2", () => {
    expect(maxImpostersForPlayers(10)).toBe(2);
  });
});

describe("defaultImposterCount", () => {
  it("uses one imposter until seven players", () => {
    expect(defaultImposterCount(4)).toBe(1);
    expect(defaultImposterCount(6)).toBe(1);
    expect(defaultImposterCount(7)).toBe(2);
  });
});

describe("clampImposterCount", () => {
  it("clamps to valid range", () => {
    expect(clampImposterCount(4, 99)).toBe(1);
    expect(clampImposterCount(8, 1)).toBe(1);
  });
});

describe("dealImposterRound", () => {
  it("is deterministic with a fixed rng sequence", () => {
    let i = 0;
    const seq = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    const rng = () => seq[i++ % seq.length] ?? 0.5;

    const result = dealImposterRound({
      playerIds: ["a", "b", "c", "d"],
      imposterCount: 1,
      wordBank: ["Apple", "Banana"],
      rng,
    });
    expect(result.secretWord).toBeDefined();
    expect(result.imposterPlayerIds).toHaveLength(1);
    expect(["a", "b", "c", "d"]).toContain(result.imposterPlayerIds[0]);
  });
});

describe("getImposterSetupError", () => {
  it("accepts a valid setup", () => {
    expect(
      getImposterSetupError({
        playerCount: 4,
        imposterCount: 1,
        playerNames: ["A", "B", "C", "D"],
      }),
    ).toBeNull();
  });

  it("rejects empty names", () => {
    expect(
      getImposterSetupError({
        playerCount: 4,
        imposterCount: 1,
        playerNames: ["A", "B", "", "D"],
      }),
    ).toContain("name");
  });
});
