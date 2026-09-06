import { describe, expect, it } from "vitest";

import type { ImposterSnapshot } from "@/domain/imposter/types";
import {
  createImposterRevealRound,
  validateImposterSnapshotSetup,
} from "@/features/imposter/imposterRoundFlow";

function buildSnapshot(): ImposterSnapshot {
  return {
    step: "review",
    playerCount: 4,
    imposterCount: 1,
    players: [
      { id: "player-1", name: "Ada" },
      { id: "player-2", name: "Grace" },
      { id: "player-3", name: "Katherine" },
      { id: "player-4", name: "Dorothy" },
    ],
    round: null,
  };
}

describe("imposterRoundFlow", () => {
  it("validates setup from the current snapshot", () => {
    expect(validateImposterSnapshotSetup(buildSnapshot())).toBeNull();

    expect(
      validateImposterSnapshotSetup({
        ...buildSnapshot(),
        players: [
          { id: "player-1", name: "Ada" },
          { id: "player-2", name: "" },
          { id: "player-3", name: "Katherine" },
          { id: "player-4", name: "Dorothy" },
        ],
      }),
    ).toMatch(/Every player needs a name/);
  });

  it("creates a fresh reveal round from the current players", () => {
    const round = createImposterRevealRound({
      snapshot: buildSnapshot(),
      wordBank: ["apple"],
      rng: () => 0,
    });

    expect(round.secretWord).toBe("apple");
    expect(round.imposterPlayerIds).toHaveLength(1);
    expect(round.revealPlayerIndex).toBe(0);
    expect(round.revealRevealed).toBe(false);
  });
});
