import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  native: false,
  bridge: {
    read: vi.fn(),
    write: vi.fn(),
    remove: vi.fn(),
    setKeepAwake: vi.fn(),
    setPrivacy: vi.fn(),
  },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mocks.native },
  registerPlugin: () => mocks.bridge,
}));

const schema = z.object({ schemaVersion: z.literal(1), score: z.number().int() });
const snapshot = (score: number) => ({ schemaVersion: 1 as const, score });
const envelope = (score: number, revision = 1) =>
  JSON.stringify({
    storageVersion: 1,
    revision,
    savedAt: "2026-10-20T12:00:00.000Z",
    payload: snapshot(score),
  });

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function store() {
  return import("./nativeSnapshotStore");
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.clearAllMocks();
  mocks.native = false;
  localStorage.clear();
});

describe("durable snapshot store", () => {
  it("blocks initial writes until loading succeeds, then writes atomic current/previous envelopes", async () => {
    const api = await store();
    await expect(api.writeSnapshot("game", snapshot(1))).rejects.toMatchObject({
      code: "not-hydrated",
    });
    expect(await api.readSnapshot("game", schema)).toEqual({ value: null, recovered: false });
    await api.writeSnapshot("game", snapshot(1));
    await api.writeSnapshot("game", snapshot(2));
    const pair = JSON.parse(localStorage.getItem("rvlry.snapshot.game")!);
    expect(JSON.parse(pair.current)).toMatchObject({ revision: 2, payload: snapshot(2) });
    expect(JSON.parse(pair.previous)).toMatchObject({ revision: 1, payload: snapshot(1) });
    expect(await api.readSnapshot("game", schema)).toEqual({
      value: snapshot(2),
      recovered: false,
    });
  });

  it("captures queued action values before callers can mutate them", async () => {
    const api = await store();
    const loading = api.readSnapshot("game", schema);
    const value = snapshot(2);
    const saving = api.writeSnapshot("game", value);
    value.score = 99;
    await loading;
    await saving;
    expect((await api.readSnapshot("game", schema)).value?.score).toBe(2);
  });

  it("recovers a valid previous checkpoint and preserves it on the next write", async () => {
    const current = JSON.stringify({
      storageVersion: 1,
      revision: 8,
      savedAt: "2026-10-20T12:00:00.000Z",
      payload: { schemaVersion: 1, score: "broken" },
    });
    const previous = envelope(7, 7);
    localStorage.setItem("rvlry.snapshot.game", JSON.stringify({ current, previous }));
    const api = await store();
    expect(await api.readSnapshot("game", schema)).toEqual({
      value: snapshot(7),
      recovered: true,
    });
    expect(JSON.parse(localStorage.getItem("rvlry.snapshot.game")!).current).toBe(current);
    await api.writeSnapshot("game", snapshot(9));
    const pair = JSON.parse(localStorage.getItem("rvlry.snapshot.game")!);
    expect(pair.previous).toBe(previous);
    expect(JSON.parse(pair.current).revision).toBe(9);
  });

  it("recovers when current is missing but previous is intact", async () => {
    localStorage.setItem(
      "rvlry.snapshot.game",
      JSON.stringify({ current: null, previous: envelope(4) }),
    );
    expect(await (await store()).readSnapshot("game", schema)).toEqual({
      value: snapshot(4),
      recovered: true,
    });
  });

  it.each([
    JSON.stringify({ storageVersion: 2, revision: 4, payload: snapshot(4) }),
    JSON.stringify({
      storageVersion: 1,
      revision: 4,
      savedAt: "2026-10-20T12:00:00.000Z",
      payload: { schemaVersion: 2, score: 4 },
    }),
  ])("retains unsupported formats and does not silently roll them back", async (current) => {
    const saved = JSON.stringify({ current, previous: envelope(3) });
    localStorage.setItem("rvlry.snapshot.game", saved);
    const api = await store();
    await expect(api.readSnapshot("game", schema)).rejects.toMatchObject({ code: "incompatible" });
    await expect(api.writeSnapshot("game", snapshot(0))).rejects.toMatchObject({
      code: "not-hydrated",
    });
    expect(localStorage.getItem("rvlry.snapshot.game")).toBe(saved);
    await api.removeSnapshot("game");
    await api.writeSnapshot("game", snapshot(0));
    expect((await api.readSnapshot("game", schema)).value).toEqual(snapshot(0));
  });

  it("retains two corrupt records and blocks writes even after an earlier successful load", async () => {
    const api = await store();
    await api.readSnapshot("game", schema);
    const saved = JSON.stringify({ current: "{broken", previous: "also broken" });
    localStorage.setItem("rvlry.snapshot.game", saved);
    await expect(api.readSnapshot("game", schema)).rejects.toMatchObject({ code: "corrupt" });
    await expect(api.writeSnapshot("game", snapshot(0))).rejects.toMatchObject({
      code: "not-hydrated",
    });
    expect(localStorage.getItem("rvlry.snapshot.game")).toBe(saved);
  });

  it("rejects a malformed outgoing snapshot without replacing good data", async () => {
    const api = await store();
    await api.readSnapshot("game", schema);
    await api.writeSnapshot("game", snapshot(2));
    const saved = localStorage.getItem("rvlry.snapshot.game");
    await expect(
      api.writeSnapshot("game", { schemaVersion: 1, score: "bad" }),
    ).rejects.toMatchObject({
      code: "corrupt",
    });
    expect(localStorage.getItem("rvlry.snapshot.game")).toBe(saved);
  });

  it("reports failed writes without claiming memory is durable, and allows retry", async () => {
    const api = await store();
    await api.readSnapshot("game", schema);
    await api.writeSnapshot("game", snapshot(2));
    const saved = localStorage.getItem("rvlry.snapshot.game");
    const failure = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    await expect(api.writeSnapshot("game", snapshot(3))).rejects.toMatchObject({
      code: "unavailable",
    });
    expect(localStorage.getItem("rvlry.snapshot.game")).toBe(saved);
    failure.mockRestore();
    await api.writeSnapshot("game", snapshot(3));
    expect((await api.readSnapshot("game", schema)).value).toEqual(snapshot(3));
  });

  it("reports inaccessible storage without enabling writes", async () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Denied", "SecurityError");
    });
    const api = await store();
    await expect(api.readSnapshot("game", schema)).rejects.toMatchObject({ code: "unavailable" });
    await expect(api.writeSnapshot("game", snapshot(0))).rejects.toMatchObject({
      code: "not-hydrated",
    });
  });

  it("serializes native saves and removal while independent games remain usable", async () => {
    mocks.native = true;
    const disk = new Map<string, { current: string | null; previous: string | null }>();
    mocks.bridge.read.mockImplementation(
      async ({ key }: { key: string }) => disk.get(key) ?? { current: null, previous: null },
    );
    const firstWrite = deferred();
    const entered = deferred();
    mocks.bridge.write.mockImplementation(
      async ({ key, value }: { key: string; value: string }) => {
        if (key === "game" && !disk.has(key)) {
          entered.resolve();
          await firstWrite.promise;
        }
        disk.set(key, { current: value, previous: disk.get(key)?.current ?? null });
      },
    );
    mocks.bridge.remove.mockImplementation(async ({ key }: { key: string }) => {
      disk.delete(key);
    });
    const api = await store();
    await api.readSnapshot("game", schema);
    await api.readSnapshot("other", schema);
    const first = api.writeSnapshot("game", snapshot(1));
    await entered.promise;
    const second = api.writeSnapshot("game", snapshot(2));
    const removal = api.removeSnapshot("game");
    const loading = api.readSnapshot("game", schema);
    await api.writeSnapshot("other", snapshot(9));
    expect(mocks.bridge.remove).not.toHaveBeenCalled();
    expect(disk.has("other")).toBe(true);
    firstWrite.resolve();
    await Promise.all([first, second, removal]);
    expect(await loading).toEqual({ value: null, recovered: false });
    expect(disk.has("game")).toBe(false);
    expect(mocks.bridge.write.mock.calls.slice(0, 3).map(([call]) => call.key)).toEqual([
      "game",
      "other",
      "game",
    ]);
  });

  it("repairs native recovery before rotation so the backup remains valid", async () => {
    mocks.native = true;
    const previous = envelope(4, 4);
    mocks.bridge.read.mockResolvedValue({ current: "broken", previous });
    mocks.bridge.write.mockResolvedValue(undefined);
    const api = await store();
    expect((await api.readSnapshot("game", schema)).recovered).toBe(true);
    await api.writeSnapshot("game", snapshot(5));
    expect(mocks.bridge.write.mock.calls[0]?.[0]).toEqual({ key: "game", value: previous });
    expect(JSON.parse(mocks.bridge.write.mock.calls[1]?.[0].value)).toMatchObject({
      revision: 5,
      payload: snapshot(5),
    });
  });

  it("does not poison the native queue when a save fails", async () => {
    mocks.native = true;
    mocks.bridge.read.mockResolvedValue({ current: null, previous: null });
    mocks.bridge.write.mockRejectedValueOnce(new Error("disk error")).mockResolvedValue(undefined);
    const api = await store();
    await api.readSnapshot("game", schema);
    const first = api.writeSnapshot("game", snapshot(1));
    const retry = api.writeSnapshot("game", snapshot(2));
    await expect(first).rejects.toMatchObject({ code: "unavailable" });
    await retry;
    expect(JSON.parse(mocks.bridge.write.mock.calls[1]?.[0].value)).toMatchObject({ revision: 1 });
  });

  it("retains both snapshots when removal fails", async () => {
    const saved = JSON.stringify({ current: envelope(2), previous: envelope(1) });
    localStorage.setItem("rvlry.snapshot.game", saved);
    const api = await store();
    await api.readSnapshot("game", schema);
    const failure = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("disk error");
    });
    await expect(api.removeSnapshot("game")).rejects.toMatchObject({ code: "unavailable" });
    expect(localStorage.getItem("rvlry.snapshot.game")).toBe(saved);
    failure.mockRestore();
    await api.removeSnapshot("game");
    expect(await api.readSnapshot("game", schema)).toEqual({ value: null, recovered: false });
  });
});
