import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { applyHatGameAction } from "@/domain/hat-game/engine";
import { buildDefaultSetup } from "@/domain/hat-game/setup";
import type { ClueSubmissionMap } from "@/domain/hat-game/types";

import { createInitialHatSnapshot, startHatSession } from "./hatSingleplayerTransitions";
import { useHatTurnLifecycle } from "./useHatTurnLifecycle";

vi.mock("@/services/gameSoundEffects", () => ({ playGameSoundEffect: vi.fn() }));

describe("useHatTurnLifecycle", () => {
  afterEach(() => vi.useRealTimers());

  it("dispatches end-turn after the authoritative client deadline", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-08-09T10:00:00.000Z");
    vi.setSystemTime(now);
    const { teams, players } = buildDefaultSetup(4, 2);
    const clueSubmissions: ClueSubmissionMap = Object.fromEntries(
      players.map((player) => [
        player.id,
        { clues: ["Ada", "Grace", "Linus", "Hedy", "Alan", "Katherine"] },
      ]),
    );
    const setup = { ...createInitialHatSnapshot(), teams, players, clueSubmissions };
    const ready = startHatSession(setup, setup);
    const started = applyHatGameAction(
      ready.session!,
      { type: "start-turn" },
      {
        nowMs: () => now.getTime(),
        makeTimestamp: () => now.toISOString(),
        toIso: (timestamp) => new Date(timestamp).toISOString(),
        isPast: () => false,
        rng: () => 0,
      },
    );
    if ("error" in started) throw new Error(started.error);
    const snapshot = { ...ready, session: started };
    const snapshotRef = { current: snapshot };
    const dispatch = vi.fn();

    const { result } = renderHook(() => useHatTurnLifecycle(snapshot, snapshotRef, dispatch));
    expect(result.current.secondsRemaining).toBeGreaterThan(0);
    await act(async () => vi.advanceTimersByTimeAsync(61_000));
    expect(dispatch).toHaveBeenCalledWith({ type: "end-turn" });
  });
});
