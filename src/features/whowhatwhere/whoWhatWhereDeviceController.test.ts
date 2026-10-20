import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMatch, endTurn, startTurn } from "@/domain/whowhatwhere/game";
import { createDefaultSettings, createTeamSetups } from "@/domain/whowhatwhere/setup";
import { WhoWhatWhereDeviceController } from "@/features/whowhatwhere/whoWhatWhereDeviceController";
import {
  createWhoWhatWhereDeviceSession,
  type WhoWhatWhereDeviceSession,
  whoWhatWhereDeviceSessionSchema,
} from "@/features/whowhatwhere/whoWhatWhereDeviceSession";
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
}));

vi.mock("@/domain/whowhatwhere/wordList", () => ({
  getWhoWhatWhereWordList: () =>
    Array.from({ length: 20 }, (_, index) => ({
      word: `Test clue ${index}`,
      category: "What",
      hint: `Hint ${index}`,
    })),
}));
vi.mock("@/services/gameSoundEffects", () => ({ playGameSoundEffect: vi.fn() }));
vi.mock("@/services/deviceLifecycle", () => ({
  isDeviceActive: () => device.active,
  setDeviceKeepAwake: vi.fn(async () => undefined),
  setDevicePrivacy: vi.fn(async () => undefined),
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
  controller.startNewMatch();
  await settle();
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
  });

  afterEach(async () => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
    await settle();
    vi.restoreAllMocks();
    vi.useRealTimers();
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
    controller.startNewMatch();
    await settle();
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
    controller.goToSettingsFromLanding();
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
    expect(controller.getSnapshot().session.mode).toBe("settings");
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
    expect(controller.getSnapshot().session.mode).toBe("landing");
  });

  it("retains the roster and settings after results, without resuming a completed match", async () => {
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
    expect((device.saved as WhoWhatWhereDeviceSession).match).toBeNull();
    const restored = new WhoWhatWhereDeviceController();
    await restored.hydrate();
    expect(restored.getSnapshot().session.mode).toBe("settings");
    expect(restored.getSnapshot().session.setup).toEqual({ ...session.setup, settings });
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
