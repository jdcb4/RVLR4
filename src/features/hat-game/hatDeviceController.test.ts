import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCatalogueForGame } from "@/data/wordCatalogue";
import * as clueSuggestions from "@/domain/hat-game/clueSuggestions";
import { applyHatGameAction } from "@/domain/hat-game/engine";
import { hatStateToRosterRows } from "@/domain/hat-game/setup";
import { HatDeviceController } from "@/features/hat-game/hatDeviceController";
import {
  createHatDeviceSession,
  HAT_DEVICE_SESSION_KEY,
  type HatDeviceSession,
  hatDeviceSessionSchema,
} from "@/features/hat-game/hatDeviceSession";
import {
  beginHatClueEntry,
  createHatTeamSetup,
  startHatSession,
} from "@/features/hat-game/hatSingleplayerTransitions";
import { requireContentPreferences } from "@/services/contentPreference";
import { setDeviceKeepAwake } from "@/services/deviceLifecycle";
import { playGameSoundEffect } from "@/services/gameSoundEffects";
import { readSnapshot, removeSnapshot, writeSnapshot } from "@/services/nativeSnapshotStore";

const device = vi.hoisted(() => ({
  active: true,
  activity: null as ((active: boolean) => void) | null,
  saved: null as unknown,
}));
vi.mock("@/services/deviceLifecycle", () => ({
  isDeviceActive: () => device.active,
  setDeviceKeepAwake: vi.fn(async () => undefined),
  subscribeDeviceActivity: (listener: (active: boolean) => void) => {
    device.activity = listener;
    listener(device.active);
    return () => {
      device.activity = null;
    };
  },
}));
vi.mock("@/services/nativeSnapshotStore", () => ({
  readSnapshot: vi.fn(),
  writeSnapshot: vi.fn(),
  removeSnapshot: vi.fn(),
}));
vi.mock("@/services/gameSoundEffects", () => ({
  playGameSoundEffect: vi.fn(async () => undefined),
}));
vi.mock("@/services/contentPreference", () => ({
  requireContentPreferences: vi.fn(),
}));

let monotonic = 0;
const cleanups: Array<() => void> = [];
async function settle() {
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
}
function preparedSession(): HatDeviceSession {
  const state = createHatDeviceSession();
  const teams = createHatTeamSetup(state.snapshot);
  if (!teams.snapshot) throw new Error(teams.error);
  const clues = beginHatClueEntry(teams.snapshot);
  if (!clues.snapshot) throw new Error(clues.error);
  const snapshot = {
    ...clues.snapshot,
    clueSubmissions: Object.fromEntries(
      clues.snapshot.players.map((player) => [
        player.id,
        { clues: Array.from({ length: 6 }, (_, index) => `${player.name} figure ${index}`) },
      ]),
    ),
  };
  return { ...state, snapshot: startHatSession(snapshot, snapshot) };
}
async function playing(mount = false) {
  device.saved = preparedSession();
  const controller = new HatDeviceController();
  if (mount) cleanups.push(controller.mount());
  await controller.hydrate();
  await controller.openSavedGame();
  controller.action({ type: "start-turn" });
  await settle();
  return controller;
}
function activity(active: boolean) {
  device.active = active;
  device.activity?.(active);
}
async function enteringClues() {
  const state = createHatDeviceSession();
  const teams = createHatTeamSetup(state.snapshot);
  if (!teams.snapshot) throw new Error(teams.error);
  const entry = beginHatClueEntry(teams.snapshot);
  if (!entry.snapshot) throw new Error(entry.error);
  device.saved = { ...state, snapshot: entry.snapshot };
  const controller = new HatDeviceController();
  await controller.hydrate();
  await controller.openSavedGame();
  controller.revealClues();
  await settle();
  return controller;
}
function currentClues(controller: HatDeviceController) {
  const snapshot = controller.getSnapshot().session.snapshot;
  return snapshot.clueSubmissions[snapshot.players[snapshot.clueEntryIndex]!.id]!.clues;
}

describe("Hat native session ownership", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-22T10:00:00Z"));
    monotonic = 0;
    vi.spyOn(performance, "now").mockImplementation(() => monotonic);
    device.active = true;
    device.activity = null;
    device.saved = null;
    vi.mocked(readSnapshot).mockImplementation(async (_key, schema) => ({
      value: device.saved === null ? null : schema.parse(structuredClone(device.saved)),
      recovered: false,
    }));
    vi.mocked(writeSnapshot).mockImplementation(async (key, value) => {
      expect(key).toBe(HAT_DEVICE_SESSION_KEY);
      device.saved = structuredClone(hatDeviceSessionSchema.parse(value));
    });
    vi.mocked(removeSnapshot).mockImplementation(async () => {
      device.saved = null;
    });
    vi.mocked(requireContentPreferences).mockResolvedValue({ kidsMode: false });
    vi.clearAllMocks();
  });
  afterEach(async () => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
    await settle();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("flushes roster drafts with their exact setup position and keeps chooser timestamps untouched", async () => {
    const controller = new HatDeviceController();
    await controller.hydrate();
    controller.beginTeams();
    await settle();
    const snapshot = controller.getSnapshot().session.snapshot;
    const rows = hatStateToRosterRows(snapshot.teams, snapshot.players);
    controller.setRoster(
      rows.map((team, index) =>
        index === 0
          ? {
              ...team,
              name: "Saved team",
              players: team.players.map((player, seat) =>
                seat === 0 ? { ...player, name: "" } : player,
              ),
            }
          : team,
      ),
    );
    expect(await controller.leaveGame()).toBe(true);
    const restored = new HatDeviceController();
    await restored.hydrate();
    const save = restored.getSnapshot().session;
    expect(save.snapshot).toMatchObject({
      step: "team",
      teamEditIndex: 0,
      teams: [{ name: "Saved team" }, {}],
    });
    expect(save.snapshot.players.find((player) => player.teamId === rows[0]?.id)?.name).toBe("");
    vi.mocked(writeSnapshot).mockClear();
    cleanups.push(restored.mount());
    await settle();
    expect(await restored.leaveGame()).toBe(true);
    expect(writeSnapshot).not.toHaveBeenCalled();
    expect(restored.getSnapshot().session.savedAt).toBe(save.savedAt);
  });

  it("saves a private clue draft on background and cold-restores it behind a personal handoff", async () => {
    const controller = new HatDeviceController();
    cleanups.push(controller.mount());
    await controller.hydrate();
    controller.beginTeams();
    await settle();
    controller.confirmTeam();
    await settle();
    controller.confirmTeam();
    await settle();
    controller.beginClues();
    await settle();
    controller.revealClues();
    await settle();
    controller.updateClue(0, "A private partial figure");
    activity(false);
    await settle();
    expect(controller.getSnapshot().session).toMatchObject({
      paused: true,
      snapshot: { clueEntryRevealed: false },
    });
    activity(true);
    const restored = new HatDeviceController();
    await restored.hydrate();
    expect(restored.getSnapshot().savedGameAvailable).toBe(true);
    await restored.openSavedGame();
    const snapshot = restored.getSnapshot().session.snapshot;
    expect(snapshot.step).toBe("clues");
    expect(snapshot.clueEntryRevealed).toBe(false);
    expect(snapshot.clueSubmissions[snapshot.players[0]!.id]?.clues[0]).toBe(
      "A private partial figure",
    );
  });

  it("uses the global kids preference for automatic suggestions while preserving manual and saved figures", async () => {
    vi.mocked(requireContentPreferences).mockResolvedValue({ kidsMode: true });
    const controller = await enteringClues();
    const adultFigure = getCatalogueForGame("hat").find((entry) => !entry.kidAppropriate)!.word;
    controller.updateClue(1, adultFigure);
    await controller.suggestClue(0);
    const clue = currentClues(controller)[0];
    expect(getCatalogueForGame("hat", { kidsMode: true }).some(({ word }) => word === clue)).toBe(
      true,
    );
    expect(currentClues(controller)[1]).toBe(adultFigure);
    await controller.leaveGame();
    const restored = new HatDeviceController();
    await restored.hydrate();
    await restored.openSavedGame();
    expect(currentClues(restored)[1]).toBe(adultFigure);
  });

  it("allows adult suggestions when the global kids preference is off", async () => {
    const controller = await enteringClues();
    const suggestions = clueSuggestions.getHatClueSuggestions();
    const adultFigure = getCatalogueForGame("hat").find((entry) => !entry.kidAppropriate)!.word;
    vi.spyOn(Math, "random").mockReturnValue(
      (suggestions.indexOf(adultFigure) + 0.5) / suggestions.length,
    );
    await controller.suggestClue(0);
    expect(currentClues(controller)[0]).toBe(adultFigure);
  });

  it("surfaces preference failures without replacing a figure or drawing from an unfiltered pool", async () => {
    const controller = await enteringClues();
    controller.updateClue(0, "My own figure");
    vi.mocked(requireContentPreferences).mockRejectedValueOnce(
      new Error("Content settings could not load."),
    );
    const getSuggestions = vi.spyOn(clueSuggestions, "getHatClueSuggestions");
    await controller.suggestClue(0);
    expect(controller.getSnapshot().error).toBe("Content settings could not load.");
    expect(currentClues(controller)[0]).toBe("My own figure");
    expect(getSuggestions).not.toHaveBeenCalled();
  });

  it.each([{ pool: [] }, { pool: ["Already in the hat"] }])(
    "reports an empty or exhausted pool without a fallback: $pool",
    async ({ pool }) => {
      const controller = await enteringClues();
      controller.updateClue(0, "Already in the hat");
      vi.spyOn(clueSuggestions, "getHatClueSuggestions").mockReturnValue(pool);
      await controller.suggestClue(1);
      expect(currentClues(controller)).toEqual(["Already in the hat", "", "", "", "", ""]);
      expect(controller.getSnapshot().error).toBe(
        "No unused famous figures match the current content settings.",
      );
    },
  );

  it("ignores repeated suggestion taps and does not overwrite edits while preferences load", async () => {
    const controller = await enteringClues();
    let release: ((preferences: { kidsMode: boolean }) => void) | undefined;
    vi.mocked(requireContentPreferences).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const pending = controller.suggestClue(0);
    await controller.suggestClue(0);
    expect(requireContentPreferences).toHaveBeenCalledTimes(1);
    controller.updateClue(0, "My newer figure");
    release?.({ kidsMode: true });
    await pending;
    expect(currentClues(controller)[0]).toBe("My newer figure");
    expect(controller.getSnapshot().error).toBe("");
  });

  it.each(["handoff", "leave", "pause"])(
    "does not apply a late suggestion after %s",
    async (navigation) => {
      const controller = await enteringClues();
      for (let index = 0; index < 6; index += 1) controller.updateClue(index, `My figure ${index}`);
      let release: ((preferences: { kidsMode: boolean }) => void) | undefined;
      vi.mocked(requireContentPreferences).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = resolve;
          }),
      );
      const before = controller.getSnapshot().session.snapshot.clueSubmissions;
      const pending = controller.suggestClue(0);
      if (navigation === "handoff") controller.confirmClues();
      else if (navigation === "leave") await controller.leaveGame();
      else {
        controller.pauseGame();
        await controller.resumeGame();
        controller.revealClues();
      }
      await settle();
      release?.({ kidsMode: true });
      await pending;
      expect(controller.getSnapshot().session.snapshot.clueSubmissions).toEqual(before);
    },
  );

  it("does not show late preference errors after leaving clue entry", async () => {
    const controller = await enteringClues();
    let reject: ((error: Error) => void) | undefined;
    vi.mocked(requireContentPreferences).mockImplementationOnce(
      () =>
        new Promise((_resolve, rejectPromise) => {
          reject = rejectPromise;
        }),
    );
    const pending = controller.suggestClue(0);
    await controller.leaveGame();
    reject?.(new Error("Content settings unavailable"));
    await pending;
    expect(controller.getSnapshot().error).toBe("");
  });

  it("commits the generated queue before revealing and ignores repeated start taps", async () => {
    device.saved = preparedSession();
    const controller = new HatDeviceController();
    await controller.hydrate();
    await controller.openSavedGame();
    let release: (() => void) | undefined;
    vi.mocked(writeSnapshot).mockImplementationOnce(async (_key, value) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      device.saved = structuredClone(hatDeviceSessionSchema.parse(value));
    });
    controller.action({ type: "start-turn" });
    const generated = controller.getSnapshot().session.snapshot.session?.activeTurn?.clueQueue;
    expect(controller.getSnapshot()).toMatchObject({ saving: true, session: { paused: true } });
    controller.action({ type: "start-turn" });
    expect(controller.getSnapshot().session.snapshot.session?.activeTurn?.clueQueue).toBe(
      generated,
    );
    release?.();
    await settle();
    expect(controller.getSnapshot()).toMatchObject({ saving: false, session: { paused: false } });
    expect((device.saved as HatDeviceSession).snapshot.session?.activeTurn?.clueQueue).toEqual(
      generated,
    );
  });

  it("backgrounding during a pending queue commit keeps the clue concealed", async () => {
    device.saved = preparedSession();
    const controller = new HatDeviceController();
    cleanups.push(controller.mount());
    await controller.hydrate();
    await controller.openSavedGame();
    let release: (() => void) | undefined;
    vi.mocked(writeSnapshot).mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    });
    controller.action({ type: "start-turn" });
    activity(false);
    release?.();
    await settle();
    expect(controller.getSnapshot().session.paused).toBe(true);
    activity(true);
    await settle();
    expect(controller.getSnapshot().session.paused).toBe(true);
  });

  it("pauses monotonic time through a long lock and ignores a wall-clock change", async () => {
    const controller = await playing(true);
    monotonic += 2250;
    await vi.advanceTimersByTimeAsync(250);
    const remaining = controller.getSnapshot().session.remainingMs;
    expect(remaining).toBe(42750);
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    monotonic += 500;
    activity(false);
    await settle();
    const pausedMs = controller.getSnapshot().session.remainingMs;
    monotonic += 120_000;
    await vi.advanceTimersByTimeAsync(120_000);
    activity(true);
    expect(controller.getSnapshot().session.remainingMs).toBe(pausedMs);
    expect(controller.getSnapshot().session.snapshot.session?.stage).toBe("turn");
    expect(setDeviceKeepAwake).toHaveBeenLastCalledWith(false);
    await controller.resumeGame();
    controller.action({ type: "mark-correct" });
    await settle();
    expect(controller.getSnapshot().session.snapshot.session?.activeTurn?.score).toBe(1);
    expect(controller.getSnapshot().session.remainingMs).toBe(pausedMs);
  });

  it("cold-restores the exact queue, score, skips and remaining time into the paused summary", async () => {
    const controller = await playing();
    controller.action({ type: "skip-clue" });
    await settle();
    controller.action({ type: "mark-correct" });
    await settle();
    monotonic += 1234;
    await controller.leaveGame();
    const original = controller.getSnapshot().session;
    const restored = new HatDeviceController();
    await restored.hydrate();
    await restored.openSavedGame();
    expect(restored.getSnapshot().savedGameAvailable).toBe(false);
    expect(restored.getSnapshot().session.paused).toBe(true);
    expect(restored.getSnapshot().session.snapshot.session).toEqual(original.snapshot.session);
    expect(restored.getSnapshot().session.remainingMs).toBe(original.remainingMs);
    expect(restored.getSnapshot().session.snapshot.session?.activeTurn?.score).toBe(1);
  });

  it("keeps remaining time and presenter when Describe advances to One Word mid-turn", async () => {
    const controller = await playing();
    monotonic += 3210;
    const before = controller.getSnapshot().session.snapshot.session!;
    for (let index = 0; index < before.cluePool.length; index += 1) {
      controller.action({ type: "mark-correct" });
      await settle();
    }
    const current = controller.getSnapshot().session;
    expect(current.snapshot.session).toMatchObject({
      stage: "turn",
      phaseNumber: 2,
      teamIndex: before.teamIndex,
      activeTurn: { score: before.cluePool.length, queueIndex: 0, skippedClues: [] },
    });
    expect(current.remainingMs).toBe(41790);
    expect(hatDeviceSessionSchema.safeParse(device.saved).success).toBe(true);
    expect(playGameSoundEffect).toHaveBeenCalledWith("turnStart");
    expect(playGameSoundEffect).toHaveBeenCalledWith("phaseOneWord");
  });

  it("expires once at its monotonic budget and retains the timeout recap", async () => {
    const controller = await playing(true);
    vi.mocked(playGameSoundEffect).mockClear();
    monotonic = 45_000;
    await vi.advanceTimersByTimeAsync(1000);
    expect(controller.getSnapshot().session).toMatchObject({ recap: true, remainingMs: null });
    expect(controller.getSnapshot().session.snapshot.session?.stage).toBe("ready");
    expect(
      vi.mocked(playGameSoundEffect).mock.calls.filter(([effect]) => effect === "timeout"),
    ).toHaveLength(1);
  });

  it("freezes failed writes and retries the same generated queue before an explicit resume", async () => {
    device.saved = preparedSession();
    const controller = new HatDeviceController();
    await controller.hydrate();
    await controller.openSavedGame();
    vi.mocked(writeSnapshot).mockRejectedValueOnce(new Error("Storage full"));
    controller.action({ type: "start-turn" });
    await settle();
    const queue = controller.getSnapshot().session.snapshot.session?.activeTurn?.clueQueue;
    expect(controller.getSnapshot()).toMatchObject({
      storageError: "Storage full",
      session: { paused: true },
    });
    controller.action({ type: "mark-correct" });
    expect(controller.getSnapshot().session.snapshot.session?.activeTurn?.score).toBe(0);
    await controller.retrySave();
    expect(controller.getSnapshot().storageError).toBe("");
    expect(controller.getSnapshot().session.paused).toBe(true);
    await controller.resumeGame();
    expect(controller.getSnapshot().session.snapshot.session?.activeTurn?.clueQueue).toEqual(queue);
  });

  it("preserves recap position across relaunch and prevents starting a new turn through it", async () => {
    const controller = await playing();
    controller.action({ type: "mark-correct" });
    await settle();
    controller.action({ type: "end-turn" });
    await settle();
    expect(controller.getSnapshot().session.recap).toBe(true);
    controller.action({ type: "start-turn" });
    await settle();
    expect(controller.getSnapshot().session.snapshot.session?.stage).toBe("ready");
    const restored = new HatDeviceController();
    await restored.hydrate();
    await restored.openSavedGame();
    expect(restored.getSnapshot().session.recap).toBe(true);
    restored.advanceRecap();
    await settle();
    expect(restored.getSnapshot().session.recap).toBe(false);
  });

  it("finishes Charades through a final recap and saves fresh setup once results are viewed", async () => {
    const state = preparedSession();
    const started = applyHatGameAction(state.snapshot.session!, { type: "start-turn" });
    if ("error" in started || !started.activeTurn) throw new Error("Fixture failed");
    const last = started.activeTurn.clueQueue.at(-1)!;
    state.snapshot.session = {
      ...started,
      phaseNumber: 3,
      usedCluePoolIndices: started.cluePool
        .map((_, index) => index)
        .filter((index) => index !== last.poolIndex),
      activeTurn: { ...started.activeTurn, queueIndex: started.activeTurn.clueQueue.length - 1 },
    };
    state.remainingMs = 20_000;
    device.saved = state;
    const controller = new HatDeviceController();
    await controller.hydrate();
    await controller.openSavedGame();
    await controller.resumeGame();
    controller.action({ type: "mark-correct" });
    await settle();
    expect(controller.getSnapshot().session.snapshot.session?.stage).toBe("finalSummary");
    controller.advanceRecap();
    await settle();
    expect(controller.getSnapshot().session.snapshot.session?.stage).toBe("results");
    expect(device.saved).toMatchObject({
      snapshot: { step: "settings", session: null, clueSubmissions: {} },
      remainingMs: null,
    });
  });

  it("retains an unavailable save without writing and supports deliberate discard", async () => {
    vi.mocked(readSnapshot).mockRejectedValueOnce(new Error("Unsupported format"));
    const controller = new HatDeviceController();
    await controller.hydrate();
    expect(controller.getSnapshot().hydrationFailed).toBe(true);
    controller.beginTeams();
    await controller.startNewGame();
    expect(writeSnapshot).not.toHaveBeenCalled();
    expect(await controller.leaveGame()).toBe(true);
    await controller.discardUnavailableSave();
    expect(removeSnapshot).toHaveBeenCalledWith(HAT_DEVICE_SESSION_KEY);
    expect(controller.getSnapshot().hydrationFailed).toBe(false);
  });

  it("normalizes a completed checkpoint to fresh setup without reviving its finished game", async () => {
    const state = preparedSession();
    const match = state.snapshot.session!;
    match.stage = "results";
    match.results = {
      leaderboard: match.teams.map((team) => ({
        teamId: team.id,
        teamName: team.name,
        score: team.score,
      })),
      winnerTeamIds: match.teams.map((team) => team.id),
      isTie: true,
      totalClues: match.cluePool.length,
      bestTurn: null,
    };
    device.saved = state;
    const controller = new HatDeviceController();
    await controller.hydrate();
    expect(controller.getSnapshot().session).toMatchObject({
      snapshot: { step: "settings", session: null, clueSubmissions: {} },
      remainingMs: null,
      recap: false,
    });
    expect(writeSnapshot).not.toHaveBeenCalled();
    await controller.openSavedGame();
    expect(controller.getSnapshot().session.snapshot.session).toBeNull();
    expect(controller.getSnapshot().session.paused).toBe(false);
  });

  it("keeps the prior saved game when a confirmed replacement fails", async () => {
    const controller = await playing();
    await controller.leaveGame();
    const match = controller.getSnapshot().session.snapshot.session;
    const saved = structuredClone(device.saved);
    vi.mocked(writeSnapshot).mockRejectedValueOnce(new Error("Storage unavailable"));
    await controller.startNewGame();
    expect(device.saved).toEqual(saved);
    expect(controller.getSnapshot().session.snapshot.session).toEqual(match);
    expect(controller.getSnapshot().storageError).toBe("Storage unavailable");
  });

  it("rejects unsupported versions and invalid timer, presenter, clue and setup references", () => {
    const state = preparedSession();
    expect(hatDeviceSessionSchema.safeParse(state).success).toBe(true);
    expect(hatDeviceSessionSchema.safeParse({ ...state, schemaVersion: 2 }).success).toBe(false);
    expect(hatDeviceSessionSchema.safeParse({ ...state, remainingMs: 100 }).success).toBe(false);
    const badClue = structuredClone(state);
    badClue.snapshot.session!.cluePool[0]!.submittedBy = "missing";
    expect(hatDeviceSessionSchema.safeParse(badClue).success).toBe(false);
    const badPresenter = structuredClone(state);
    badPresenter.snapshot.session!.describerIndexes[badPresenter.snapshot.teams[0]!.id] = 99;
    expect(hatDeviceSessionSchema.safeParse(badPresenter).success).toBe(false);
    const badStep = structuredClone(state);
    badStep.snapshot.session = null;
    badStep.snapshot.step = "clues";
    badStep.snapshot.clueEntryIndex = 99;
    expect(hatDeviceSessionSchema.safeParse(badStep).success).toBe(false);
  });
});
