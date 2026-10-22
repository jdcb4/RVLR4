import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCatalogueForGame } from "@/data/wordCatalogue";
import * as wordLists from "@/domain/imposter/wordList";
import { ImposterDeviceController } from "@/features/imposter/imposterDeviceController";
import {
  createImposterDeviceSession,
  IMPOSTER_DEVICE_SESSION_KEY,
  type ImposterDeviceSession,
  imposterDeviceSessionSchema,
} from "@/features/imposter/imposterDeviceSession";
import { requireContentPreferences } from "@/services/contentPreference";
import { setDeviceKeepAwake } from "@/services/deviceLifecycle";
import { readSnapshot, removeSnapshot, writeSnapshot } from "@/services/nativeSnapshotStore";

const device = vi.hoisted(() => ({
  active: true,
  activity: null as ((active: boolean) => void) | null,
  saved: null as ImposterDeviceSession | null,
}));
vi.mock("@/services/nativeSnapshotStore", () => ({
  readSnapshot: vi.fn(),
  writeSnapshot: vi.fn(),
  removeSnapshot: vi.fn(),
}));
vi.mock("@/services/contentPreference", () => ({
  requireContentPreferences: vi.fn(),
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
const cleanup: Array<() => void> = [];
async function setup() {
  const controller = new ImposterDeviceController();
  await controller.hydrate();
  await controller.advanceSetup();
  await controller.advanceSetup();
  return controller;
}
beforeEach(() => {
  device.active = true;
  device.activity = null;
  device.saved = null;
  vi.mocked(requireContentPreferences).mockResolvedValue({ kidsMode: false });
  vi.mocked(readSnapshot).mockImplementation(async () => ({
    value: device.saved,
    recovered: false,
  }));
  vi.mocked(writeSnapshot).mockImplementation(async (_key, value) => {
    device.saved = structuredClone(value) as ImposterDeviceSession;
  });
  vi.mocked(removeSnapshot).mockImplementation(async () => {
    device.saved = null;
  });
});
afterEach(() => {
  cleanup.splice(0).forEach((stop) => stop());
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("Imposter durable device controller", () => {
  it("keeps initial settings ephemeral and clears the saved roster when returning", async () => {
    vi.useFakeTimers();
    const controller = new ImposterDeviceController();
    await controller.hydrate();
    controller.updatePlayerCount(7);
    controller.updateWordDifficulty("easy");
    await vi.advanceTimersByTimeAsync(400);
    expect(await controller.leave()).toBe(true);
    expect(writeSnapshot).not.toHaveBeenCalled();
    expect(removeSnapshot).not.toHaveBeenCalled();
    controller.resume();
    await controller.advanceSetup();
    expect(device.saved?.snapshot).toMatchObject({
      step: "roster",
      playerCount: 7,
      wordDifficulty: "easy",
    });
    await controller.back();
    expect(device.saved).toBeNull();
    expect(controller.getSnapshot().session.snapshot).toMatchObject({
      step: "settings",
      playerCount: 7,
    });
    expect(removeSnapshot).toHaveBeenCalledOnce();
  });

  it("cleans old settings records and preserves active chooser saves untouched", async () => {
    device.saved = createImposterDeviceSession();
    const first = new ImposterDeviceController();
    await first.hydrate();
    expect(first.getSnapshot().savedGameAvailable).toBe(false);
    expect(device.saved).toBeNull();
    await first.advanceSetup();
    await first.advanceSetup();
    await first.startRound();
    const saved = structuredClone(device.saved);
    vi.mocked(writeSnapshot).mockClear();
    vi.mocked(removeSnapshot).mockClear();
    const chooser = new ImposterDeviceController();
    await chooser.hydrate();
    chooser.updatePlayerCount(7);
    chooser.pause();
    expect(await chooser.leave()).toBe(true);
    expect(chooser.getSnapshot().savedGameAvailable).toBe(true);
    expect(device.saved).toEqual(saved);
    expect(writeSnapshot).not.toHaveBeenCalled();
    expect(removeSnapshot).not.toHaveBeenCalled();
  });

  it("does not pause fresh setup when effects are replayed before hydration finishes", async () => {
    const controller = new ImposterDeviceController();
    const firstCleanup = controller.mount();
    firstCleanup();
    cleanup.push(controller.mount());
    await controller.hydrate();
    expect(controller.getSnapshot().session.snapshot.step).toBe("settings");
    expect(controller.getSnapshot().paused).toBe(false);
  });

  it("retains the six-player default and persists assignments before exposing roles", async () => {
    const controller = await setup();
    let resolve!: () => void;
    vi.mocked(writeSnapshot).mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const start = controller.startRound();
    await Promise.resolve();
    controller.revealRole();
    expect(controller.getSnapshot().session.snapshot.step).toBe("review");
    expect(controller.getSnapshot().roleVisible).toBe(false);
    const record = vi.mocked(writeSnapshot).mock.calls.at(-1)![1] as ImposterDeviceSession;
    expect(record.snapshot.players).toHaveLength(6);
    expect(record.snapshot.imposterCount).toBe(1);
    expect(record.snapshot.round?.secretWord).toBeTruthy();
    expect(record.snapshot.round?.revealRevealed).toBe(false);
    expect(vi.mocked(writeSnapshot).mock.calls.at(-1)![0]).toBe(IMPOSTER_DEVICE_SESSION_KEY);
    resolve();
    await start;
    controller.revealRole();
    expect(controller.getSnapshot().roleVisible).toBe(true);
  });

  it("hides an interrupted role and re-reveals the same player and assignments", async () => {
    const controller = await setup();
    cleanup.push(controller.mount());
    await controller.startRound();
    expect(setDeviceKeepAwake).toHaveBeenLastCalledWith(true);
    controller.revealRole();
    const original = structuredClone(controller.getSnapshot().session.snapshot.round);
    device.active = false;
    device.activity?.(false);
    expect(setDeviceKeepAwake).toHaveBeenLastCalledWith(false);
    expect(controller.getSnapshot().roleVisible).toBe(false);
    expect(controller.getSnapshot().paused).toBe(true);
    device.active = true;
    device.activity?.(true);
    controller.resume();
    expect(setDeviceKeepAwake).toHaveBeenLastCalledWith(true);
    controller.revealRole();
    expect(controller.getSnapshot().roleVisible).toBe(true);
    expect(controller.getSnapshot().session.snapshot.round).toEqual(original);
    const fresh = new ImposterDeviceController();
    await fresh.hydrate();
    expect(fresh.getSnapshot().savedGameAvailable).toBe(true);
    expect(fresh.getSnapshot().roleVisible).toBe(false);
    fresh.resume();
    fresh.revealRole();
    expect(fresh.getSnapshot().session.snapshot.round).toEqual(original);
  });

  it("flushes draft changes on teardown and releases keep-awake without revealing pending content", async () => {
    vi.useFakeTimers();
    const controller = new ImposterDeviceController();
    await controller.hydrate();
    const unmount = controller.mount();
    await controller.advanceSetup();
    controller.updateName(controller.getSnapshot().session.snapshot.players[0]!.id, "Last edit");
    unmount();
    await Promise.resolve();
    await Promise.resolve();
    expect(device.saved?.snapshot.players[0]!.name).toBe("Last edit");
    expect(controller.getSnapshot().roleVisible).toBe(false);
    expect(controller.getSnapshot().paused).toBe(true);
    expect(controller.getSnapshot().saving).toBe(false);
  });

  it("does not expose a role if backgrounding happens while the deal commits", async () => {
    const controller = await setup();
    cleanup.push(controller.mount());
    let resolve!: () => void;
    vi.mocked(writeSnapshot).mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const start = controller.startRound();
    await Promise.resolve();
    device.active = false;
    device.activity?.(false);
    resolve();
    await start;
    expect(controller.getSnapshot().session.snapshot.step).toBe("reveal");
    expect(controller.getSnapshot().paused).toBe(true);
    controller.revealRole();
    expect(controller.getSnapshot().roleVisible).toBe(false);
  });

  it("retry saves the original deal without rerandomizing", async () => {
    const controller = await setup();
    const random = vi.spyOn(Math, "random");
    vi.mocked(writeSnapshot).mockRejectedValueOnce(new Error("Disk full"));
    await controller.startRound();
    const attempted = vi.mocked(writeSnapshot).mock.calls.at(-1)![1] as ImposterDeviceSession;
    const randomCalls = random.mock.calls.length;
    vi.mocked(requireContentPreferences).mockResolvedValue({ kidsMode: true });
    expect(controller.getSnapshot().storageError).toBe("Disk full");
    expect(controller.getSnapshot().session.snapshot.step).toBe("review");
    await controller.startRound();
    await controller.retry();
    expect(random).toHaveBeenCalledTimes(randomCalls);
    expect(requireContentPreferences).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().session.snapshot.round).toEqual(attempted.snapshot.round);
    expect(controller.getSnapshot().roleVisible).toBe(false);
    controller.resume();
    controller.revealRole();
    expect(controller.getSnapshot().roleVisible).toBe(true);
  });

  it("requires each private reveal before passing, then preserves clues, discussion and final warning", async () => {
    const controller = await setup();
    await controller.startRound();
    await controller.finishRole();
    expect(controller.getSnapshot().session.snapshot.round!.revealPlayerIndex).toBe(0);
    for (let index = 0; index < 6; index += 1) {
      controller.revealRole();
      const first = controller.finishRole();
      const repeated = controller.finishRole();
      await Promise.all([first, repeated]);
      expect(controller.getSnapshot().roleVisible).toBe(false);
    }
    expect(controller.getSnapshot().session.snapshot.step).toBe("guidePregame");
    await controller.advanceGuide();
    expect(controller.getSnapshot().session.snapshot.step).toBe("guidePrediscussion");
    await controller.advanceGuide();
    expect(controller.getSnapshot().session.snapshot.step).toBe("guideWarning");
    await controller.advanceGuide();
    expect(controller.getSnapshot().session.snapshot.step).toBe("results");
    expect(device.saved).toBeNull();
    await controller.startNew();
    expect(controller.getSnapshot().session.snapshot.step).toBe("settings");
  });

  it("persists draft names and position when backgrounded and permits fixing empty names", async () => {
    vi.useFakeTimers();
    const controller = new ImposterDeviceController();
    await controller.hydrate();
    cleanup.push(controller.mount());
    controller.updatePlayerCount(7);
    await controller.advanceSetup();
    controller.updateName(controller.getSnapshot().session.snapshot.players[0]!.id, "");
    await controller.back();
    await controller.advanceSetup();
    await controller.advanceSetup();
    expect(controller.getSnapshot().setupError).toBe("Every player needs a name.");
    controller.updateName(controller.getSnapshot().session.snapshot.players[0]!.id, "Joe");
    device.active = false;
    device.activity?.(false);
    await Promise.resolve();
    await Promise.resolve();
    expect(device.saved?.snapshot.players[0]!.name).toBe("Joe");
    expect(device.saved?.snapshot.step).toBe("roster");
    expect(device.saved?.snapshot.imposterCount).toBe(2);
  });

  it("keeps an existing save and timestamp until a replacement succeeds", async () => {
    const controller = await setup();
    await controller.startRound();
    const original = structuredClone(device.saved);
    const restored = new ImposterDeviceController();
    await restored.hydrate();
    expect(writeSnapshot).toHaveBeenCalledTimes(3);
    expect(restored.getSnapshot().session.savedAt).toBe(original!.savedAt);
    vi.mocked(removeSnapshot).mockRejectedValueOnce(new Error("Unavailable"));
    await restored.startNew();
    expect(restored.getSnapshot().session.snapshot.round).toEqual(original!.snapshot.round);
    expect(device.saved).toEqual(original);
    await restored.retry();
    restored.resume();
    expect(restored.getSnapshot().session.snapshot.step).toBe("settings");
    expect(device.saved).toBeNull();
  });

  it("does not write after failed hydration and requires explicit discard", async () => {
    vi.mocked(readSnapshot).mockRejectedValueOnce(new Error("Unreadable"));
    const controller = new ImposterDeviceController();
    await controller.hydrate();
    controller.updatePlayerCount(7);
    await controller.startNew();
    expect(writeSnapshot).not.toHaveBeenCalled();
    expect(await controller.leave()).toBe(true);
    await controller.discardUnavailable();
    expect(removeSnapshot).toHaveBeenCalledWith(IMPOSTER_DEVICE_SESSION_KEY);
    expect(controller.getSnapshot().hydrationFailed).toBe(false);
  });

  it("persists difficulty and uses its allowed kids-safe tiers only when dealing a new round", async () => {
    vi.useFakeTimers();
    const controller = new ImposterDeviceController();
    await controller.hydrate();
    expect(controller.getSnapshot().session.snapshot.wordDifficulty).toBe("hard");
    controller.updateWordDifficulty("medium");
    await vi.advanceTimersByTimeAsync(400);
    expect(device.saved).toBeNull();
    expect(controller.getSnapshot().session.snapshot.wordDifficulty).toBe("medium");
    await controller.advanceSetup();
    expect(device.saved?.snapshot.wordDifficulty).toBe("medium");
    await controller.advanceSetup();
    vi.mocked(requireContentPreferences).mockResolvedValue({ kidsMode: true });
    await controller.startRound();
    const originalRound = structuredClone(controller.getSnapshot().session.snapshot.round);
    const pool = getCatalogueForGame("imposter", { difficulty: "medium", kidsMode: true });
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.some(({ word }) => word === originalRound?.secretWord)).toBe(true);
    vi.mocked(requireContentPreferences).mockRejectedValue(new Error("Unavailable preferences"));
    const restored = new ImposterDeviceController();
    await restored.hydrate();
    restored.resume();
    restored.revealRole();
    expect(restored.getSnapshot().session.snapshot.round).toEqual(originalRound);
    expect(restored.getSnapshot().session.snapshot.wordDifficulty).toBe("medium");
    expect(requireContentPreferences).toHaveBeenCalledTimes(1);
  });

  it("does not deal when preferences cannot load and allows retry without a storage error", async () => {
    const controller = await setup();
    const random = vi.spyOn(Math, "random");
    const writes = vi.mocked(writeSnapshot).mock.calls.length;
    vi.mocked(requireContentPreferences).mockRejectedValueOnce(
      new Error("Kids mode could not be loaded. Retry in app settings before selecting new words."),
    );
    await controller.startRound();
    expect(controller.getSnapshot().setupError).toContain("Kids mode could not be loaded");
    expect(controller.getSnapshot().storageError).toBe("");
    expect(controller.getSnapshot().session.snapshot.step).toBe("review");
    expect(writeSnapshot).toHaveBeenCalledTimes(writes);
    expect(random).not.toHaveBeenCalled();
    await controller.startRound();
    expect(controller.getSnapshot().session.snapshot.step).toBe("reveal");
  });

  it("explains an empty filtered pool without falling back or writing a deal", async () => {
    const controller = await setup();
    await controller.back();
    await controller.back();
    controller.updateWordDifficulty("hard");
    await controller.advanceSetup();
    await controller.advanceSetup();
    vi.mocked(requireContentPreferences).mockResolvedValue({ kidsMode: true });
    const words = vi.spyOn(wordLists, "chooseImposterWord").mockReturnValueOnce(undefined);
    const writes = vi.mocked(writeSnapshot).mock.calls.length;
    await controller.startRound();
    expect(words).toHaveBeenCalledExactlyOnceWith(
      { difficulty: "hard", kidsMode: true },
      Math.random,
    );
    expect(controller.getSnapshot().setupError).toContain("No words match these settings");
    expect(controller.getSnapshot().session.snapshot.round).toBeNull();
    expect(writeSnapshot).toHaveBeenCalledTimes(writes);
  });

  it("deals Hard Kids rounds from available lower tiers when no hard clues exist", async () => {
    const controller = await setup();
    vi.mocked(requireContentPreferences).mockResolvedValue({ kidsMode: true });
    const random = vi.spyOn(Math, "random").mockReturnValue(0.75);
    await controller.startRound();
    const word = controller.getSnapshot().session.snapshot.round?.secretWord;
    const entry = getCatalogueForGame("imposter", { kidsMode: true }).find(
      (item) => item.word === word,
    );
    expect(entry).toMatchObject({ difficulty: "medium", kidAppropriate: true });
    expect(controller.getSnapshot().setupError).toBe("");
    expect(random).toHaveBeenCalled();
  });

  it("blocks repeat deals during preference loading and cancels when covered before generation", async () => {
    const controller = await setup();
    let resolve!: (value: { kidsMode: boolean }) => void;
    vi.mocked(requireContentPreferences).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const writes = vi.mocked(writeSnapshot).mock.calls.length;
    const start = controller.startRound();
    await controller.startRound();
    expect(controller.getSnapshot().saving).toBe(true);
    expect(requireContentPreferences).toHaveBeenCalledTimes(1);
    controller.pause();
    resolve({ kidsMode: true });
    await start;
    expect(controller.getSnapshot().saving).toBe(false);
    expect(controller.getSnapshot().paused).toBe(true);
    expect(controller.getSnapshot().session.snapshot.round).toBeNull();
    expect(writeSnapshot).toHaveBeenCalledTimes(writes);
  });
});

it("loads old version-1 sessions with all difficulties and validates new selections", () => {
  const session = createImposterDeviceSession();
  const { wordDifficulty: _difficulty, ...legacySnapshot } = session.snapshot;
  expect(
    imposterDeviceSessionSchema.parse({ ...session, snapshot: legacySnapshot }).snapshot
      .wordDifficulty,
  ).toBe("all");
  expect(
    imposterDeviceSessionSchema.safeParse({
      ...session,
      snapshot: { ...session.snapshot, wordDifficulty: "extreme" },
    }).success,
  ).toBe(false);
});

it("rejects visible private roles, invalid roster references, unsupported formats and malformed deals", () => {
  const draft = createImposterDeviceSession();
  expect(imposterDeviceSessionSchema.safeParse(draft).success).toBe(true);
  const round = {
    secretWord: "Moon",
    imposterPlayerIds: [draft.snapshot.players[0]!.id],
    revealPlayerIndex: 0,
    revealRevealed: false,
  };
  const record = { ...draft, snapshot: { ...draft.snapshot, step: "reveal", round } };
  expect(imposterDeviceSessionSchema.safeParse(record).success).toBe(true);
  expect(imposterDeviceSessionSchema.safeParse({ ...record, schemaVersion: 2 }).success).toBe(
    false,
  );
  for (const invalid of [
    { ...round, revealRevealed: true },
    { ...round, revealPlayerIndex: 6 },
    { ...round, imposterPlayerIds: ["unknown"] },
  ])
    expect(
      imposterDeviceSessionSchema.safeParse({
        ...record,
        snapshot: { ...record.snapshot, round: invalid },
      }).success,
    ).toBe(false);
});
