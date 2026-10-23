import { beforeEach, expect, it, vi } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: () => ({}),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  localStorage.clear();
});

it("defaults off, persists Simple mode independently and restores it on startup", async () => {
  localStorage.setItem("rvlry.snapshot.whowhatwhere.device-session.v1", "saved game");
  let api = await import("./contentPreference");
  expect(await api.requireContentPreferences()).toEqual({ simpleMode: false });
  await api.selectSimpleMode(true);
  vi.resetModules();
  api = await import("./contentPreference");
  expect(await api.requireContentPreferences()).toEqual({ simpleMode: true });
  expect(localStorage.getItem("rvlry.snapshot.whowhatwhere.device-session.v1")).toBe("saved game");
});

it.each([
  "corrupt",
  JSON.stringify({
    current: JSON.stringify({
      storageVersion: 1,
      revision: 1,
      savedAt: "2026-10-24T00:00:00.000Z",
      payload: { schemaVersion: 1, kidsMode: true },
    }),
    previous: null,
  }),
])("ignores the retired child preference without changing its bytes", async (legacy) => {
  const legacyKey = "rvlry.snapshot.app.content.v1";
  localStorage.setItem(legacyKey, legacy);
  const api = await import("./contentPreference");
  expect(await api.requireContentPreferences()).toEqual({ simpleMode: false });
  await api.selectSimpleMode(true);
  expect(localStorage.getItem(legacyKey)).toBe(legacy);
  const stored = JSON.parse(localStorage.getItem("rvlry.snapshot.app.content.v2")!);
  expect(JSON.parse(stored.current).payload).toEqual({ schemaVersion: 2, simpleMode: true });
});

it("keeps the committed choice after a failed write and allows retry", async () => {
  const api = await import("./contentPreference");
  await api.initializeContentPreferences();
  await api.selectSimpleMode(true);
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
    throw new Error("full");
  });
  await api.selectSimpleMode(false);
  expect(api.getContentPreferenceState()).toMatchObject({ simpleMode: true, busy: false });
  expect(api.getContentPreferenceState().error).toContain("could not be saved");
  expect(await api.requireContentPreferences()).toEqual({ simpleMode: true });
  write.mockRestore();
  await api.selectSimpleMode(false);
  expect(api.getContentPreferenceState()).toMatchObject({ simpleMode: false, error: null });
});

it("waits for a pending Simple mode commit before supplying a new word pool", async () => {
  const store = await import("./nativeSnapshotStore");
  const api = await import("./contentPreference");
  await api.initializeContentPreferences();
  let finish!: () => void;
  vi.spyOn(store, "writeSnapshot").mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const save = api.selectSimpleMode(true);
  let supplied = false;
  const preference = api.requireContentPreferences().then((value) => {
    supplied = true;
    return value;
  });
  await Promise.resolve();
  expect(supplied).toBe(false);
  expect(api.getContentPreferenceState()).toMatchObject({ simpleMode: false, busy: true });
  finish();
  await save;
  expect(await preference).toEqual({ simpleMode: true });
});

it("blocks new selection when preferences cannot be read, preserves bytes and supports retry", async () => {
  const key = "rvlry.snapshot.app.content.v2";
  localStorage.setItem(key, "corrupt");
  const api = await import("./contentPreference");
  await expect(api.requireContentPreferences()).rejects.toThrow("Simple mode could not be loaded");
  await api.selectSimpleMode(true);
  expect(localStorage.getItem(key)).toBe("corrupt");
  localStorage.removeItem(key);
  expect(await api.requireContentPreferences()).toEqual({ simpleMode: false });
});

it("recovers a previous valid preference rather than silently disabling Simple mode", async () => {
  let api = await import("./contentPreference");
  await api.initializeContentPreferences();
  await api.selectSimpleMode(true);
  await api.selectSimpleMode(false);
  const key = "rvlry.snapshot.app.content.v2";
  const pair = JSON.parse(localStorage.getItem(key)!);
  localStorage.setItem(key, JSON.stringify({ ...pair, current: "corrupt" }));
  vi.resetModules();
  api = await import("./contentPreference");
  expect(await api.requireContentPreferences()).toEqual({ simpleMode: true });
});
