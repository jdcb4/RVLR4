import { describe, expect, it } from "vitest";

import type { ImposterRoundState } from "./imposterSingleplayerAppTypes";
import {
  advanceImposterReveal,
  createImposterPlayers,
  createInitialImposterSnapshot,
  showImposterRole,
  startImposterReveal,
} from "./imposterSingleplayerTransitions";

const round: ImposterRoundState = {
  theme: "Animals",
  word: "Otter",
  imposterIds: ["imposter-player-1"],
  revealPlayerIndex: 0,
  revealRevealed: false,
};

describe("Imposter single-player transitions", () => {
  it("preserves named players when the roster size changes", () => {
    const players = createImposterPlayers(3, [{ id: "kept", name: "Joe" }]);
    expect(players).toEqual([
      { id: "kept", name: "Joe" },
      { id: "imposter-player-2", name: "Player 2" },
      { id: "imposter-player-3", name: "Player 3" },
    ]);
  });

  it("moves through reveal handoffs without exposing the next role", () => {
    const started = startImposterReveal(createInitialImposterSnapshot(), round);
    const shown = showImposterRole(started);
    const next = advanceImposterReveal(shown);
    expect(next.round).toMatchObject({ revealPlayerIndex: 1, revealRevealed: false });
  });

  it("moves the final revealed player into the guide", () => {
    const initial = createInitialImposterSnapshot();
    const finalRound = {
      ...round,
      revealPlayerIndex: initial.players.length - 1,
      revealRevealed: true,
    };
    expect(advanceImposterReveal(startImposterReveal(initial, finalRound)).step).toBe(
      "guidePregame",
    );
  });
});
