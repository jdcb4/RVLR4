import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createMatch, startTurn } from "@/domain/whowhatwhere/game";
import { createDefaultSettings, createTeamSetups } from "@/domain/whowhatwhere/setup";
import type { MatchState } from "@/domain/whowhatwhere/types";

import { useWhoWhatWhereTurnTicker } from "./useWhoWhatWhereTurnTicker";

vi.mock("@/services/gameSoundEffects", () => ({ playGameSoundEffect: vi.fn() }));

describe("useWhoWhatWhereTurnTicker", () => {
  afterEach(() => vi.useRealTimers());

  it("ends an expired active turn on the interval", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-08-09T10:00:00.000Z");
    vi.setSystemTime(now);
    const settings = { ...createDefaultSettings(), turnDurationSeconds: 30 as const };
    const active = startTurn(
      createMatch(createTeamSetups(2), settings),
      [
        { word: "Ada", category: "Who", hint: "A programmer" },
        { word: "Telescope", category: "What", hint: "Looks far away" },
        { word: "Sydney", category: "Where", hint: "A harbour city" },
      ],
      now,
      () => 0,
    );
    const { result } = renderHook(() => {
      const [match, setMatch] = useState<MatchState | null>(active);
      useWhoWhatWhereTurnTicker(match, setMatch);
      return match;
    });

    await act(async () => vi.advanceTimersByTimeAsync(31_000));
    expect(result.current?.stage).not.toBe("turn");
  });
});
