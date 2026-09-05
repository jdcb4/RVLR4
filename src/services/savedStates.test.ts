import { beforeEach, describe, expect, it } from "vitest";

import { applyHatGameAction } from "@/domain/hat-game/engine";
import { buildDefaultSetup } from "@/domain/hat-game/setup";
import { createMatch, startTurn } from "@/domain/whowhatwhere/game";
import { createDefaultSettings, createTeamSetups } from "@/domain/whowhatwhere/setup";
import {
  createInitialHatSnapshot,
  startHatSession,
} from "@/features/hat-game/hatSingleplayerTransitions";
import { createInitialImposterSnapshot } from "@/features/imposter/imposterSingleplayerTransitions";

import { getStorageNotice } from "./browserStorage";
import { loadSavedState, saveState } from "./hatStorage";
import { loadImposterSavedState, saveImposterState } from "./imposterStorage";
import { hatSavedStateSchema } from "./savedStates/hat";
import { clearMatch, loadMatch, loadSetup, saveMatch } from "./whowhatwherePersistence";

const lastSavedAt = "2026-09-05T00:00:00.000Z";
beforeEach(() => localStorage.clear());

describe("validated saved games", () => {
  it("round trips a current Who What Where turn and migrates missing historical fields", () => {
    const settings = { ...createDefaultSettings(), selectedCategories: ["What"] as const };
    const match = startTurn(
      createMatch(createTeamSetups(2), settings),
      [{ word: "Tea", category: "What", hint: "Drink" }],
      new Date(lastSavedAt),
    );
    saveMatch(match, new Date(lastSavedAt));
    // JSON omits optional avatarId properties whose value is undefined.
    expect(loadMatch()).toMatchObject(JSON.parse(JSON.stringify({ savedAt: lastSavedAt, match })));
    const legacy = JSON.parse(localStorage.getItem("whowhatwhere.match.v1")!);
    delete legacy.schemaVersion;
    delete legacy.match.settings.hints;
    delete legacy.match.turnSummaries;
    delete legacy.match.activeTurn.hintsRemaining;
    delete legacy.match.activeTurn.currentWordHintRevealed;
    localStorage.setItem("whowhatwhere.match.v1", JSON.stringify(legacy));
    expect(loadMatch()?.match.activeTurn).toMatchObject({
      hintsRemaining: 0,
      currentWordHintRevealed: false,
    });
    expect(loadMatch()?.match.turnSummaries).toEqual([]);
    clearMatch();
    expect(loadMatch()).toBeNull();
  });

  it("rejects malformed settings, nested matches, and unknown versions with usable defaults", () => {
    localStorage.setItem(
      "whowhatwhere.setup.v1",
      JSON.stringify({ settings: { selectedCategories: "Who" }, teams: [] }),
    );
    expect(loadSetup().settings).toEqual(createDefaultSettings());
    for (const value of [
      { schemaVersion: 99, savedAt: lastSavedAt, match: {} },
      { savedAt: lastSavedAt, match: { gameId: "whowhatwhere", activeTurn: null } },
    ]) {
      localStorage.setItem("whowhatwhere.match.v1", JSON.stringify(value));
      expect(loadMatch()).toBeNull();
    }
    expect(getStorageNotice()).toContain("could not be read");
  });

  it("migrates a bare Hat counts snapshot and validates every phase of a real session", async () => {
    const { teams, players } = buildDefaultSetup(4, 2);
    const clueSubmissions = Object.fromEntries(
      players.map((player) => [
        player.id,
        { clues: ["Ada", "Grace", "Linus", "Hedy", "Alan", "Katherine"] },
      ]),
    );
    const setup = { ...createInitialHatSnapshot(), teams, players, clueSubmissions };
    localStorage.setItem(
      "hat-game.state.v1",
      JSON.stringify({
        ...setup,
        step: "counts",
        turnDurationSeconds: undefined,
        skipsPerTurn: undefined,
      }),
    );
    expect((await loadSavedState())?.snapshot).toMatchObject({
      step: "settings",
      turnDurationSeconds: 45,
      skipsPerTurn: 1,
    });
    const snapshot = startHatSession(setup, setup);
    for (
      let actionIndex = 0;
      snapshot.session!.stage !== "results" && actionIndex < 200;
      actionIndex += 1
    ) {
      expect(
        hatSavedStateSchema.safeParse({ schemaVersion: 1, lastSavedAt, snapshot }).success,
      ).toBe(true);
      const result = applyHatGameAction(snapshot.session!, {
        type:
          snapshot.session!.stage === "ready"
            ? "start-turn"
            : snapshot.session!.stage === "finalSummary"
              ? "view-results"
              : "mark-correct",
      });
      if ("error" in result) throw new Error(result.error);
      snapshot.session = result;
    }
    expect(snapshot.session?.stage).toBe("results");
    await saveState({ schemaVersion: 1, lastSavedAt, snapshot });
    expect((await loadSavedState())?.snapshot.session?.stage).toBe("results");
  });

  it("preserves current and bare Imposter saves and rejects null snapshots and broken roles", async () => {
    const snapshot = createInitialImposterSnapshot("reveal");
    snapshot.round = {
      secretWord: "Cat",
      imposterPlayerIds: [snapshot.players[0]!.id],
      revealPlayerIndex: 0,
      revealRevealed: false,
    };
    await saveImposterState({ schemaVersion: 1, lastSavedAt, snapshot });
    expect(await loadImposterSavedState()).toEqual({ schemaVersion: 1, lastSavedAt, snapshot });
    localStorage.setItem("imposter.state.v1", JSON.stringify(snapshot));
    expect((await loadImposterSavedState())?.snapshot).toEqual(snapshot);
    for (const value of [
      { schemaVersion: 1, lastSavedAt, snapshot: null },
      { schemaVersion: 9, lastSavedAt, snapshot },
      { ...snapshot, round: { ...snapshot.round, imposterPlayerIds: ["missing-player"] } },
    ]) {
      localStorage.setItem("imposter.state.v1", JSON.stringify(value));
      expect(await loadImposterSavedState()).toBeNull();
    }
  });
});
