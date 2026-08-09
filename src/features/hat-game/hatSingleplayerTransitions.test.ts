import { describe, expect, it } from "vitest";

import { GAME_DEFAULTS } from "@/config/hatDefaults";
import { buildDefaultSetup } from "@/domain/hat-game/setup";

import {
  createInitialHatSnapshot,
  normalizeHatSnapshot,
  startHatSession,
  syncHatClueSubmissions,
} from "./hatSingleplayerTransitions";

describe("Hat single-player transitions", () => {
  it("normalizes legacy setup snapshots with current defaults", () => {
    const legacy =
      createInitialHatSnapshot() as typeof createInitialHatSnapshot extends () => infer T
        ? T
        : never;
    Object.assign(legacy, {
      step: "counts",
      turnDurationSeconds: undefined,
      skipsPerTurn: undefined,
    });
    expect(normalizeHatSnapshot(legacy)).toMatchObject({
      step: "settings",
      turnDurationSeconds: GAME_DEFAULTS.turnDurationSeconds,
      skipsPerTurn: GAME_DEFAULTS.skipsPerTurn,
    });
  });

  it("preserves clues by player and fills missing slots", () => {
    const { players } = buildDefaultSetup(4, 2);
    const clues = syncHatClueSubmissions(players, { [players[0]!.id]: { clues: ["Ada"] } });
    expect(clues[players[0]!.id]?.clues).toEqual([
      "Ada",
      ...Array.from({ length: GAME_DEFAULTS.cluesPerPlayer - 1 }, () => ""),
    ]);
    expect(Object.keys(clues)).toHaveLength(4);
  });

  it("starts a fresh session for replay without mutating setup", () => {
    const setup = createInitialHatSnapshot();
    const { teams, players } = buildDefaultSetup(4, 2);
    const source = {
      ...setup,
      teams,
      players,
      clueSubmissions: syncHatClueSubmissions(players, {}),
    };
    for (const submission of Object.values(source.clueSubmissions)) submission.clues.fill("Ada");
    const started = startHatSession(source, source);
    expect(started.step).toBe("game");
    expect(started.session).not.toBeNull();
    expect(source.session).toBeNull();
  });
});
