import { describe, expect, it } from "vitest";

import { remainingTurnMs, turnDeadline } from "./turnClock";

describe("durable turn clock", () => {
  it("subtracts only positive elapsed time and expires at zero", () => {
    expect(remainingTurnMs(30_000, 100, 1100)).toBe(29_000);
    expect(remainingTurnMs(30_000, 100, 99)).toBe(30_000);
    expect(remainingTurnMs(30_000, 100, 40_000)).toBe(0);
  });
  it("rebases the engine deadline without altering the saved budget", () => {
    expect(turnDeadline(1500, 0)).toBe("1970-01-01T00:00:01.500Z");
    expect(turnDeadline(-10, 0)).toBe("1970-01-01T00:00:00.000Z");
  });
});
