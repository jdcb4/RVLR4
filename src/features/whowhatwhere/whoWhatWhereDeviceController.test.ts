import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMatch, endTurn, startTurn } from "@/domain/whowhatwhere/game";
import { createDefaultSettings, createTeamSetups } from "@/domain/whowhatwhere/setup";
import { getWhoWhatWhereWordList } from "@/domain/whowhatwhere/wordList";
import { WhoWhatWhereDeviceController } from "@/features/whowhatwhere/whoWhatWhereDeviceController";
import {
  createWhoWhatWhereDeviceSession,
  type WhoWhatWhereDeviceSession,
  whoWhatWhereDeviceSessionSchema,
} from "@/features/whowhatwhere/whoWhatWhereDeviceSession";
import { requireContentPreferences } from "@/services/contentPreference";
import { setDeviceKeepAwake } from "@/services/deviceLifecycle";
import { playGameSoundEffect } from "@/services/gameSoundEffects";
import { readSnapshot, removeSnapshot, writeSnapshot } from "@/services/nativeSnapshotStore";

const device = vi.hoisted(() => ({
  active: true,
  activity: null as ((active: boolean) => void) | null,
  saved: null as unknown,
}));
const words = Array.from({ length: 20 }, (_, index) => ({
  word: `Test clue ${index}`,
  category: "What" as const,
  hint: `Hint ${index}`,
  difficulty: "easy" as const,
}));

vi.mock("@/domain/whowhatwhere/wordList", () => ({
  getWhoWhatWhereWordList: vi.fn(() =>
    Array.from({ length: 20 }, (_, index) => ({
      word: `Test clue ${index}`,
      category: "What",
      hint: `Hint ${index}`,
      difficulty: "easy",
    })),
  ),
}));
vi.mock("@/services/contentPreference", () => ({
  requireContentPreferences: vi.fn(async () => ({ simpleMode: false })),
}));
vi.mock("@/services/gameSoundEffects", () => ({ playGameSoundEffect: vi.fn() }));
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

let monotonic = 0;
const cleanups: Array<() => void> = [];

async function settle() {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
}

async function advance(ms: number) {
  monotonic += ms;
  await vi.advanceTimersByTimeAsync(ms);
}

async function activeController(mount = false) {
  const controller = new WhoWhatWhereDeviceController();
  if (mount) cleanups.push(controller.mount());
  await controller.hydrate();
  controller.updateSettings({
    ...createDefaultSettings(),
    selectedCategories: ["What"],
    turnDurationSeconds: 30,
  });
  await controller.startNewMatch();
  await controller.startNextTurn();
  return controller;
}

describe("WWW device session durability and lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T10:00:00Z"));
    vi.spyOn(performance, "now").mockImplementation(() => monotonic);
    monotonic = 0;
    device.saved = null;
    device.active = true;
    device.activity = null;
    vi.mocked(readSnapshot).mockImplementation(async (_key, schema) => ({
      value: device.saved === null ? null : schema.parse(structuredClone(device.saved)),
      recovered: false,
    }));
    vi.mocked(writeSnapshot).mockImplementation(async (_key, value) => {
      device.saved = structuredClone(whoWhatWhereDeviceSessionSchema.parse(value));
    });
    vi.mocked(removeSnapshot).mockImplementation(async () => {
      device.saved = null;
    });
    vi.clearAllMocks();
    vi.mocked(requireContentPreferences).mockResolvedValue({ simpleMode: false });
    vi.mocked(getWhoWhatWhereWordList).mockReturnValue(words);
  });

  afterEach(async () => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
    await settle();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("keeps the first settings page ephemeral and clears saves when returning from team setup", async () => {
    const controller = new WhoWhatWhereDeviceController();
    await controller.hydrate();
    controller.goToSettingsFromLanding();
    await settle();
    controller.updateSettings({
      ...controller.getSnapshot().session.setup.settings,
      totalRounds: 4,
    });
    await advance(400);
    expect(await controller.leaveGame()).toBe(true);
    expect(writeSnapshot).not.toHaveBeenCalled();
    expect(removeSnapshot).not.toHaveBeenCalled();
    expect(controller.getSnapshot().session.setup.settings.totalRounds).toBe(4);
    await controller.resumeGame();
    controller.goToTeamSetup();
    await settle();
    expect(device.saved).toMatchObject({ mode: "team", setup: { settings: { totalRounds: 4 } } });
    controller.goBackFromTeamSetup();
    await settle();
    expect(device.saved).toBeNull();
    expect(controller.getSnapshot().session.mode).toBe("settings");
    expect(controller.getSnapshot().session.setup.settings.totalRounds).toBe(4);
    expect(removeSnapshot).toHaveBeenCalledOnce();
  });

  it.each(["landing", "settings"] as const)(
    "cleans legacy %s saves without offering resume",
    async (mode) => {
      device.saved = { ...createWhoWhatWhereDeviceSession(), mode, paused: true };
      const controller = new WhoWhatWhereDeviceController();
      await controller.hydrate();
      expect(controller.getSnapshot().savedGameAvailable).toBe(false);
      expect(controller.getSnapshot().session.paused).toBe(false);
      expect(device.saved).toBeNull();
      expect(writeSnapshot).not.toHaveBeenCalled();
    },
  );

  it("captures Simple mode once per match and keeps word settings through later turns and restoration", async () => {
    vi.mocked(requireContentPreferences).mockResolvedValue({ simpleMode: true });
    const controller = new WhoWhatWhereDeviceController();
    await controller.hydrate();
    controller.updateSettings({
      ...createDefaultSettings(),
      selectedCategories: ["What"],
      wordDifficulty: "medium",
    });
    await controller.startNewMatch();
    expect(controller.getSnapshot().session.match?.settings).toMatchObject({
      wordDifficulty: "medium",
      simpleMode: true,
    });
    expect(device.saved).toMatchObject({
      setup: { settings: { wordDifficulty: "medium", simpleMode: true } },
      match: { settings: { wordDifficulty: "medium", simpleMode: true } },
    });

    vi.mocked(requireContentPreferences).mockResolvedValue({ simpleMode: false });
    await controller.startNextTurn();
    controller.endTurn();
    await settle();
    controller.advanceTurnRecap();
    await settle();

    const restored = new WhoWhatWhereDeviceController();
    await restored.hydrate();
    await restored.openSavedGame();
    await restored.startNextTurn();
    expect(requireContentPreferences).toHaveBeenCalledTimes(1);
    expect(getWhoWhatWhereWordList).toHaveBeenLastCalledWith({
      difficulty: "medium",
      simpleMode: true,
    });
    expect(restored.getSnapshot().session.match?.settings.simpleMode).toBe(true);

    await restored.startOverFromPendingMatch();
    await restored.startNewMatch();
    expect(requireContentPreferences).toHaveBeenCalledTimes(2);
    expect(restored.getSnapshot().session.match?.settings.simpleMode).toBe(false);
  });

  it("preserves v1 saves without treating the legacy difficulty as a word filter", async () => {
    const settings = { ...createDefaultSettings(), difficultyMode: "hard" as const };
    const session = createWhoWhatWhereDeviceSession();
    const match = createMatch(session.setup.teams, settings);
    const legacySettings = {
      ...Object.fromEntries(
        Object.entries(settings).filter(
          ([key]) => key !== "wordDifficulty" && key !== "simpleMode",
        ),
      ),
      kidsMode: true,
    };
    device.saved = {
      ...session,
      mode: "ready",
      setup: { ...session.setup, settings: legacySettings },
      match: { ...match, settings: legacySettings },
    };
    vi.mocked(requireContentPreferences).mockResolvedValue({ simpleMode: true });

    const restored = new WhoWhatWhereDeviceController();
    await restored.hydrate();
    await restored.openSavedGame();
    await restored.startNextTurn();
    expect(restored.getSnapshot().session.match?.settings).toMatchObject({
      difficultyMode: "hard",
      wordDifficulty: "all",
      simpleMode: false,
    });
    expect(requireContentPreferences).not.toHaveBeenCalled();
    expect(getWhoWhatWhereWordList).toHaveBeenLastCalledWith({
      difficulty: "all",
      simpleMode: false,
    });
  });

  it("uses captured words across catalogue updates and restoration, then captures an updated new match", async () => {
    const controller = await activeController();
    const originalPool = controller.getSnapshot().session.wordPool;
    expect(originalPool).toHaveLength(words.length);
    const updated = words.map((word) => ({ ...word, word: `Updated ${word.word}` }));
    vi.mocked(getWhoWhatWhereWordList).mockReturnValue(updated);
    controller.endTurn();
    await settle();
    controller.advanceTurnRecap();
    await settle();
    const restored = new WhoWhatWhereDeviceController();
    await restored.hydrate();
    await restored.openSavedGame();
    await restored.startNextTurn();
    expect(restored.getSnapshot().session.wordPool).toEqual(originalPool);
    expect(
      restored
        .getSnapshot()
        .session.match?.activeTurn?.wordQueue.every(({ word }) => !word.startsWith("Updated")),
    ).toBe(true);
    expect(getWhoWhatWhereWordList).toHaveBeenCalledTimes(1);
    await restored.startOverFromPendingMatch();
    await restored.startNewMatch();
    expect(
      restored.getSnapshot().session.wordPool?.every(({ word }) => word.startsWith("Updated")),
    ).toBe(true);
    expect(getWhoWhatWhereWordList).toHaveBeenCalledTimes(2);
  });

  it("keeps setup available when the filtered pool has no selected categories", async () => {
    const controller = new WhoWhatWhereDeviceController();
    await controller.hydrate();
    controller.updateSettings({
      ...createDefaultSettings(),
      selectedCategories: ["Where"],
      wordDifficulty: "hard",
    });
    await controller.startNewMatch();
    expect(controller.getSnapshot().setupError).toContain("No words match");
    expect(controller.getSnapshot().session.match).toBeNull();
    expect(getWhoWhatWhereWordList).toHaveBeenCalledExactlyOnceWith({
      difficulty: "hard",
      simpleMode: false,
    });
  });

  it("does not start a match when Simple mode preferences cannot be loaded", async () => {
    const controller = new WhoWhatWhereDeviceController();
    await controller.hydrate();
    vi.mocked(requireContentPreferences).mockRejectedValue(
      new Error("Retry Simple mode in app settings."),
    );
    await controller.startNewMatch();
    expect(controller.getSnapshot().setupError).toBe("Retry Simple mode in app settings.");
    expect(controller.getSnapshot().session.match).toBeNull();
    expect(writeSnapshot).not.toHaveBeenCalled();
    expect(getWhoWhatWhereWordList).not.toHaveBeenCalled();
  });

  it("flushes an unfinished roster and exact team step before navigation; restart resumes setup", async () => {
    const controller = new WhoWhatWhereDeviceController();
    await controller.hydrate();
    controller.goToSettingsFromLanding();
    await settle();
    controller.goToTeamSetup();
    await settle();
    const teams = controller.getSnapshot().session.setup.teams.map((team, index) => ({
      ...team,
      name: index === 0 ? "Our team" : team.name,
      players: team.players.map((player, seat) => ({ ...player, name: seat === 0 ? "" : "Jo" })),
    }));
    controller.setTeamSetups(teams);
    // Confirm immediately, before the 400 ms draft debounce.
    controller.advanceTeamSetup();
    await settle();

    const restored = new WhoWhatWhereDeviceController();
    await restored.hydrate();
    expect(restored.getSnapshot().session).toMatchObject({
      mode: "team",
      teamStep: 1,
      paused: true,
    });
    expect(restored.getSnapshot().session.setup.teams).toEqual(teams);
    await restored.resumeGame();
    expect(restored.getSnapshot().session.paused).toBe(false);
  });

  it("restores the generated match and checkpoint paused despite wall-clock changes and a long absence", async () => {
    const controller = await activeController(true);
    controller.skip();
    await settle();
    controller.revealHint();
    await settle();
    await advance(7350);
    const checkpoint = structuredClone(device.saved) as WhoWhatWhereDeviceSession;
    expect(checkpoint.remainingMs).toBe(22_650);
    vi.setSystemTime(new Date("2035-01-01T00:00:00Z"));
    monotonic += 1_000_000;

    const restored = new WhoWhatWhereDeviceController();
    await restored.hydrate();
    expect(restored.getSnapshot().session.match).toEqual(checkpoint.match);
    expect(restored.getSnapshot().session.remainingMs).toBe(22_650);
    expect(restored.getSnapshot().session.paused).toBe(true);
    await restored.resumeGame();
    restored.correct();
    await settle();
    expect(restored.getSnapshot().session.match?.activeTurn?.score).toBe(1);
  });

  it("pauses immediately on background and requires explicit resume while releasing keep-awake", async () => {
    const controller = await activeController(true);
    await advance(4200);
    device.active = false;
    device.activity?.(false);
    const frozen = controller.getSnapshot().session.remainingMs;
    expect(frozen).toBe(25_800);
    expect(controller.getSnapshot().session.paused).toBe(true);
    expect(setDeviceKeepAwake).toHaveBeenLastCalledWith(false);
    await advance(80_000);
    device.active = true;
    device.activity?.(true);
    expect(controller.getSnapshot().session.remainingMs).toBe(frozen);
    expect(controller.getSnapshot().session.paused).toBe(true);
    await controller.resumeGame();
    expect(setDeviceKeepAwake).toHaveBeenLastCalledWith(true);
    await advance(1000);
    expect(controller.getSnapshot().session.remainingMs).toBe(24_800);
  });

  it("saves the generated deck before revealing it and cancels automatic start if backgrounded during that save", async () => {
    const controller = new WhoWhatWhereDeviceController();
    cleanups.push(controller.mount());
    await controller.hydrate();
    controller.updateSettings({ ...createDefaultSettings(), selectedCategories: ["What"] });
    await controller.startNewMatch();
    let finishWrite: (() => void) | undefined;
    vi.mocked(writeSnapshot).mockImplementationOnce(
      (_key, value) =>
        new Promise<void>((resolve) => {
          finishWrite = () => {
            device.saved = structuredClone(value);
            resolve();
          };
        }),
    );
    const starting = controller.startNextTurn();
    await settle();
    expect(controller.getSnapshot().session.match?.stage).toBe("turn");
    expect(controller.getSnapshot().session.paused).toBe(true);
    const generated = controller.getSnapshot().session.match;
    device.active = false;
    device.activity?.(false);
    finishWrite?.();
    await starting;
    device.active = true;
    device.activity?.(true);
    expect(controller.getSnapshot().session.paused).toBe(true);
    expect(controller.getSnapshot().session.match).toEqual(generated);
  });

  it("does not double-score a rapid tap while the first score is saving", async () => {
    const controller = await activeController();
    let finishWrite: (() => void) | undefined;
    vi.mocked(writeSnapshot).mockImplementationOnce(
      (_key, value) =>
        new Promise<void>((resolve) => {
          finishWrite = () => {
            device.saved = structuredClone(value);
            resolve();
          };
        }),
    );
    controller.correct();
    controller.correct();
    expect(controller.getSnapshot().session.match?.activeTurn?.score).toBe(1);
    expect(controller.getSnapshot().session.match?.activeTurn?.wordHistory).toHaveLength(1);
    finishWrite?.();
    await settle();
    expect((device.saved as WhoWhatWhereDeviceSession).match?.activeTurn?.score).toBe(1);
  });

  it("rejects scoring at zero and finishes the expired turn only once", async () => {
    const controller = await activeController();
    monotonic = 30_000;
    controller.correct();
    controller.endTurn();
    await settle();
    expect(controller.getSnapshot().session.match?.lastTurnSummary?.scoreDelta).toBe(0);
    expect(controller.getSnapshot().session.match?.turnSummaries).toHaveLength(1);
    expect(playGameSoundEffect).toHaveBeenLastCalledWith("timeout");
  });

  it("keeps unsaved draft changes in memory behind a pause cover and retries the same state", async () => {
    const controller = new WhoWhatWhereDeviceController();
    await controller.hydrate();
    controller.goToTeamSetup();
    await settle();
    vi.mocked(writeSnapshot).mockRejectedValueOnce(new Error("Disk is full"));
    controller.updateSettings({
      ...controller.getSnapshot().session.setup.settings,
      totalRounds: 4,
    });
    await advance(400);
    expect(controller.getSnapshot().storageError).toBe("Disk is full");
    expect(controller.getSnapshot().session.paused).toBe(true);
    expect(controller.getSnapshot().session.setup.settings.totalRounds).toBe(4);
    expect(await controller.leaveGame()).toBe(false);
    controller.goToTeamSetup();
    expect(controller.getSnapshot().session.mode).toBe("team");
    await controller.retrySave();
    expect(controller.getSnapshot().storageError).toBe("");
    expect(controller.getSnapshot().session.paused).toBe(true);
    expect((device.saved as WhoWhatWhereDeviceSession).setup.settings.totalRounds).toBe(4);
  });

  it("retains an unreadable record until explicit discard and never writes defaults over it", async () => {
    vi.mocked(readSnapshot).mockRejectedValueOnce(new Error("Unsupported save format"));
    const controller = new WhoWhatWhereDeviceController();
    await controller.hydrate();
    controller.goToSettingsFromLanding();
    expect(writeSnapshot).not.toHaveBeenCalled();
    expect(controller.getSnapshot().hydrationFailed).toBe(true);
    expect(await controller.leaveGame()).toBe(true);
    expect(writeSnapshot).not.toHaveBeenCalled();
    expect(removeSnapshot).not.toHaveBeenCalled();
    await controller.discardUnavailableSave();
    expect(removeSnapshot).toHaveBeenCalledOnce();
    expect(controller.getSnapshot().hydrationFailed).toBe(false);
    expect(controller.getSnapshot().session.mode).toBe("settings");
  });

  it("starts a fresh install in settings and offers a saved session before allowing edits", async () => {
    const fresh = new WhoWhatWhereDeviceController();
    await fresh.hydrate();
    expect(fresh.getSnapshot()).toMatchObject({
      savedGameAvailable: false,
      session: { mode: "settings", paused: false },
    });
    fresh.goToTeamSetup();
    await settle();
    const original = structuredClone(device.saved) as WhoWhatWhereDeviceSession;
    vi.setSystemTime(new Date("2026-10-21T12:00:00Z"));
    const restored = new WhoWhatWhereDeviceController();
    await restored.hydrate();
    expect(restored.getSnapshot()).toMatchObject({
      savedGameAvailable: true,
      session: { mode: "team", savedAt: original.savedAt, paused: true },
    });
    restored.updateSettings({ ...original.setup.settings, totalRounds: 4 });
    restored.pauseGame();
    expect(await restored.leaveGame()).toBe(true);
    expect(device.saved).toEqual(original);
    await restored.resumeGame();
    expect(restored.getSnapshot()).toMatchObject({
      savedGameAvailable: false,
      session: { mode: "team", paused: false, savedAt: "2026-10-21T12:00:00.000Z" },
    });
    expect(restored.getSnapshot().session.setup).toEqual(original.setup);
  });

  it("persists reset defaults while keeping the first two teams and a valid roster step", async () => {
    const session = createWhoWhatWhereDeviceSession();
    const teams = createTeamSetups(4).map((team, index) => ({
      ...team,
      name: `Our team ${index + 1}`,
    }));
    device.saved = {
      ...session,
      mode: "team",
      teamStep: 3,
      setup: {
        ...session.setup,
        teams,
        settings: {
          ...session.setup.settings,
          teamCount: 4,
          turnDurationSeconds: 75,
          totalRounds: 1,
          skipLimit: -1,
          selectedCategories: ["Who"],
          hints: { enabled: true, perTurnLimit: 3 },
        },
      },
    };
    const controller = new WhoWhatWhereDeviceController();
    await controller.hydrate();
    await controller.resumeGame();
    controller.updateSettings(createDefaultSettings());
    expect(controller.getSnapshot().session.teamStep).toBe(1);
    expect(controller.getSnapshot().session.setup.teams).toEqual(teams.slice(0, 2));
    await advance(400);

    const restored = new WhoWhatWhereDeviceController();
    await restored.hydrate();
    expect(restored.getSnapshot().session.setup.settings).toEqual(createDefaultSettings());
    expect(restored.getSnapshot().session.setup.teams).toEqual(teams.slice(0, 2));
    expect(restored.getSnapshot().session.teamStep).toBe(1);
  });

  it.each([60, 75] as const)(
    "restores a saved %i-second game without changing its settings or countdown",
    async (turnDurationSeconds) => {
      const session = createWhoWhatWhereDeviceSession();
      const settings = {
        ...session.setup.settings,
        turnDurationSeconds,
        totalRounds: 2 as const,
        selectedCategories: ["What" as const],
      };
      const match = startTurn(createMatch(session.setup.teams, settings), words);
      device.saved = {
        ...session,
        setup: { ...session.setup, settings },
        match,
        mode: "turn",
        remainingMs: turnDurationSeconds * 1000 - 7350,
        paused: true,
      };
      const original = structuredClone(device.saved);
      const controller = new WhoWhatWhereDeviceController();
      await controller.hydrate();

      expect(controller.getSnapshot().session.setup.settings).toEqual(settings);
      expect(controller.getSnapshot().session.match).toEqual(match);
      expect(controller.getSnapshot().session.remainingMs).toBe(turnDurationSeconds * 1000 - 7350);
      expect(writeSnapshot).not.toHaveBeenCalled();
      expect(device.saved).toEqual(original);
    },
  );

  it("commits a confirmed replacement before removing the saved match and retains its roster", async () => {
    await activeController();
    const original = structuredClone(device.saved) as WhoWhatWhereDeviceSession;
    const restored = new WhoWhatWhereDeviceController();
    await restored.hydrate();
    let finishWrite: (() => void) | undefined;
    vi.mocked(removeSnapshot).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = () => {
            device.saved = null;
            resolve();
          };
        }),
    );
    const replacing = restored.startOverFromPendingMatch();
    expect(restored.getSnapshot().session.match).toEqual(original.match);
    expect(restored.getSnapshot().savedGameAvailable).toBe(true);
    expect(device.saved).toEqual(original);
    // A second tap cannot replace the pending transaction.
    await restored.startOverFromPendingMatch();
    finishWrite?.();
    await replacing;
    expect(restored.getSnapshot()).toMatchObject({
      savedGameAvailable: false,
      session: { mode: "settings", match: null, paused: false, presentationStage: null },
    });
    expect(restored.getSnapshot().session.setup).toEqual(original.setup);
    expect(device.saved).toBeNull();
  });

  it("opens a saved active turn behind its paused summary until Resume turn is selected", async () => {
    await activeController();
    const checkpoint = structuredClone(device.saved) as WhoWhatWhereDeviceSession;
    const restored = new WhoWhatWhereDeviceController();
    await restored.hydrate();
    vi.mocked(writeSnapshot).mockClear();
    await restored.openSavedGame();
    expect(restored.getSnapshot()).toMatchObject({
      savedGameAvailable: false,
      session: { paused: true, remainingMs: checkpoint.remainingMs, match: checkpoint.match },
    });
    expect(writeSnapshot).not.toHaveBeenCalled();
    monotonic += 60_000;
    restored.correct();
    expect(restored.getSnapshot().session.match).toEqual(checkpoint.match);
    await restored.resumeGame();
    expect(restored.getSnapshot().session.paused).toBe(false);
    expect(restored.getSnapshot().session.remainingMs).toBe(checkpoint.remainingMs);
  });

  it("keeps the original match recoverable when replacing its save fails", async () => {
    await activeController();
    const original = structuredClone(device.saved) as WhoWhatWhereDeviceSession;
    const restored = new WhoWhatWhereDeviceController();
    await restored.hydrate();
    vi.mocked(removeSnapshot).mockRejectedValueOnce(new Error("Disk is full"));
    await restored.startOverFromPendingMatch();
    expect(restored.getSnapshot()).toMatchObject({
      savedGameAvailable: true,
      storageError: "Disk is full",
      session: { match: original.match, paused: true },
    });
    expect(device.saved).toEqual(original);
    await restored.retrySave();
    await restored.resumeGame();
    expect(restored.getSnapshot().session.match).toBeNull();
    expect(device.saved).toBeNull();
    expect(restored.getSnapshot().session.paused).toBe(false);
  });

  it("does not overwrite a replacement with the old game when backgrounded during commit", async () => {
    const controller = await activeController(true);
    controller.pauseGame();
    await settle();
    let finishWrite: (() => void) | undefined;
    vi.mocked(removeSnapshot).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = () => {
            device.saved = null;
            resolve();
          };
        }),
    );
    const writeCount = vi.mocked(writeSnapshot).mock.calls.length;
    const replacing = controller.startOverFromPendingMatch();
    device.active = false;
    device.activity?.(false);
    finishWrite?.();
    await replacing;
    expect(writeSnapshot).toHaveBeenCalledTimes(writeCount);
    expect(removeSnapshot).toHaveBeenCalledOnce();
    expect(controller.getSnapshot().session).toMatchObject({
      mode: "settings",
      match: null,
      paused: true,
    });
    expect(device.saved).toBeNull();
  });

  it("durably shows each recap before handoff and round completion before the next round", async () => {
    const controller = await activeController();
    controller.correct();
    await settle();
    controller.endTurn();
    await settle();
    const firstSummary = controller.getSnapshot().session.match?.lastTurnSummary;
    expect(controller.getSnapshot().session).toMatchObject({
      presentationStage: "recap",
      match: { stage: "ready", teamIndex: 1, roundNumber: 1 },
    });
    await controller.startNextTurn();
    expect(controller.getSnapshot().session.match?.activeTurn).toBeNull();
    const restored = new WhoWhatWhereDeviceController();
    await restored.hydrate();
    await restored.resumeGame();
    expect(restored.getSnapshot().session.presentationStage).toBe("recap");
    expect(restored.getSnapshot().session.match?.lastTurnSummary).toEqual(firstSummary);
    restored.advanceTurnRecap();
    await settle();
    expect(restored.getSnapshot().session.presentationStage).toBeNull();
    await restored.startNextTurn();
    restored.endTurn();
    await settle();
    expect(restored.getSnapshot().session.match).toMatchObject({ roundNumber: 2, teamIndex: 0 });
    restored.advanceTurnRecap();
    await settle();
    expect(restored.getSnapshot().session.presentationStage).toBe("roundComplete");
    const nextRestore = new WhoWhatWhereDeviceController();
    await nextRestore.hydrate();
    await nextRestore.resumeGame();
    expect(nextRestore.getSnapshot().session.presentationStage).toBe("roundComplete");
    await nextRestore.startNextTurn();
    expect(nextRestore.getSnapshot().session.match?.activeTurn).toBeNull();
    nextRestore.continueAfterRound();
    await settle();
    await nextRestore.startNextTurn();
    expect(nextRestore.getSnapshot().session.match?.stage).toBe("turn");
  });

  it("shows the final turn recap then results without an extra round-complete stage", async () => {
    const controller = new WhoWhatWhereDeviceController();
    await controller.hydrate();
    controller.updateSettings({
      ...createDefaultSettings(),
      selectedCategories: ["What"],
      totalRounds: 1,
    });
    await controller.startNewMatch();
    await controller.startNextTurn();
    controller.endTurn();
    await settle();
    controller.advanceTurnRecap();
    await settle();
    await controller.startNextTurn();
    controller.endTurn();
    await settle();
    expect(controller.getSnapshot().session).toMatchObject({
      presentationStage: "recap",
      match: { stage: "finalSummary" },
    });
    controller.advanceTurnRecap();
    await settle();
    expect(controller.getSnapshot().session).toMatchObject({
      presentationStage: null,
      match: { stage: "results" },
    });
    expect(device.saved).toBeNull();
  });

  it("explicitly ends a paused turn once without running the timer or counting another score", async () => {
    const controller = await activeController();
    controller.correct();
    await settle();
    controller.pauseGame();
    await settle();
    monotonic += 90_000;
    controller.endPausedTurn();
    controller.endPausedTurn();
    await settle();
    expect(controller.getSnapshot().session).toMatchObject({
      paused: false,
      presentationStage: "recap",
      remainingMs: null,
      match: { stage: "ready", lastTurnSummary: { scoreDelta: 1 } },
    });
    expect(controller.getSnapshot().session.match?.turnSummaries).toHaveLength(1);
    expect((device.saved as WhoWhatWhereDeviceSession).presentationStage).toBe("recap");
  });

  it("loads installed v1 saves without presentation fields and recovers a previous checkpoint", async () => {
    await activeController();
    const legacy = structuredClone(device.saved) as Record<string, unknown>;
    delete legacy.presentationStage;
    vi.mocked(readSnapshot).mockImplementationOnce(async (_key, schema) => ({
      value: schema.parse(legacy),
      recovered: true,
    }));
    const restored = new WhoWhatWhereDeviceController();
    await restored.hydrate();
    expect(restored.getSnapshot()).toMatchObject({
      savedGameAvailable: true,
      notice: "Recovered the previous saved checkpoint.",
      session: { presentationStage: null, paused: true },
    });
    expect(restored.getSnapshot().session.match).toEqual(legacy.match);
  });

  it("retains results in memory and clears the completed match from disk", async () => {
    const session = createWhoWhatWhereDeviceSession();
    const settings = {
      ...session.setup.settings,
      totalRounds: 1 as const,
      selectedCategories: ["What" as const],
    };
    let match = createMatch(session.setup.teams, settings);
    match = endTurn(startTurn(match, words));
    match = endTurn(startTurn(match, words));
    device.saved = {
      ...session,
      setup: { ...session.setup, settings },
      match,
      mode: match.stage,
      paused: true,
    };
    const controller = new WhoWhatWhereDeviceController();
    await controller.hydrate();
    await controller.resumeGame();
    controller.viewResults();
    await settle();
    expect(controller.getSnapshot().session.match?.stage).toBe("results");
    expect(device.saved).toBeNull();
    const restored = new WhoWhatWhereDeviceController();
    await restored.hydrate();
    expect(restored.getSnapshot().session.mode).toBe("settings");
    expect(controller.getSnapshot().session.setup).toEqual({ ...session.setup, settings });
    expect(restored.getSnapshot().savedGameAvailable).toBe(false);
    expect(restored.getSnapshot().session.match).toBeNull();
  });

  it("rejects contradictory saved navigation and clock state", () => {
    const session = createWhoWhatWhereDeviceSession();
    expect(whoWhatWhereDeviceSessionSchema.safeParse({ ...session, mode: "turn" }).success).toBe(
      false,
    );
    const match = startTurn(
      createMatch(createTeamSetups(2), {
        ...createDefaultSettings(),
        selectedCategories: ["What"],
      }),
      words,
    );
    expect(
      whoWhatWhereDeviceSessionSchema.safeParse({
        ...session,
        match,
        mode: "review",
        remainingMs: 30_000,
      }).success,
    ).toBe(false);
  });
});
