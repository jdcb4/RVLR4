import { describe, expect, it, vi } from "vitest";

import type { HatGameSession } from "@/domain/hat-game/types";

import { playHatGameActionSoundEffects } from "./hatGameActionSound";

/** Minimal session shell — only fields used by sound logic need to be truthful. */
function stubSession(overrides: Partial<HatGameSession>): HatGameSession {
  return {
    players: [],
    teams: [],
    settings: {
      teamCount: 2,
      turnDurationSeconds: 60,
      cluesPerPlayer: 3,
      skipsPerTurn: 1,
    },
    stage: "ready",
    roundNumber: 1,
    phaseNumber: 1,
    teamOrder: [],
    teamIndex: 0,
    describerIndexes: {},
    cluePool: [],
    usedCluePoolIndices: [],
    lastSeenCluePoolIndex: null,
    activeTurn: null,
    lastTurnSummary: null,
    bestTurnSummary: null,
    results: null,
    ...overrides,
  };
}

describe("playHatGameActionSoundEffects", () => {
  it("plays turn-start when leaving ready for turn", () => {
    const playCue = vi.fn();
    const prev = stubSession({ stage: "ready" });
    const next = stubSession({ stage: "turn" });
    playHatGameActionSoundEffects(prev, next, { type: "start-turn" }, { current: null }, playCue);
    expect(playCue).toHaveBeenCalledWith("turn-start");
  });

  it("plays correct on mark-correct", () => {
    const playCue = vi.fn();
    const session = stubSession({ stage: "turn", phaseNumber: 1 });
    playHatGameActionSoundEffects(session, session, { type: "mark-correct" }, { current: null }, playCue);
    expect(playCue).toHaveBeenCalledWith("correct");
  });

  it("plays turn-end once per distinct active-turn key when leaving turn stage", () => {
    const playCue = vi.fn();
    const turnRef = { current: null as string | null };
    const prev = stubSession({
      stage: "turn",
      activeTurn: {
        startedAt: "t1",
        endsAt: "t2",
        durationSeconds: 60,
        clueQueue: [],
        queueIndex: 0,
        score: 0,
        correctCount: 0,
        skippedCount: 0,
        skipsRemaining: 1,
        skippedClues: [],
        currentSkippedCluePoolIndex: null,
        clueHistory: [],
      },
    });
    const next = stubSession({ stage: "ready", activeTurn: null });
    playHatGameActionSoundEffects(prev, next, { type: "end-turn" }, turnRef, playCue);
    expect(playCue).toHaveBeenCalledWith("turn-end");
    playCue.mockClear();
    playHatGameActionSoundEffects(prev, next, { type: "end-turn" }, turnRef, playCue);
    expect(playCue).not.toHaveBeenCalled();
  });

  it("plays phase cues when phase number advances", () => {
    const playCue = vi.fn();
    const prev = stubSession({ stage: "turn", phaseNumber: 1 });
    const next = stubSession({ stage: "turn", phaseNumber: 2 });
    playHatGameActionSoundEffects(prev, next, { type: "mark-correct" }, { current: null }, playCue);
    expect(playCue).toHaveBeenCalledWith("phase-one-word");
  });
});
