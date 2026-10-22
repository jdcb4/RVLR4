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

it("defaults off, persists Kids mode independently and restores it on startup", async () => {
  localStorage.setItem("rvlry.snapshot.whowhatwhere.device-session.v1", "saved game");
  let api = await import("./contentPreference");
  expect(await api.requireContentPreferences()).toEqual({ kidsMode: false });
  await api.selectKidsMode(true);
  vi.resetModules();
  api = await import("./contentPreference");
  expect(await api.requireContentPreferences()).toEqual({ kidsMode: true });
  expect(localStorage.getItem("rvlry.snapshot.whowhatwhere.device-session.v1")).toBe("saved game");
});

it("keeps the committed choice after a failed write and allows retry", async () => {
  const api = await import("./contentPreference");
  await api.initializeContentPreferences();
  await api.selectKidsMode(true);
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
    throw new Error("full");
  });
  await api.selectKidsMode(false);
  expect(api.getContentPreferenceState()).toMatchObject({ kidsMode: true, busy: false });
  expect(api.getContentPreferenceState().error).toContain("could not be saved");
  expect(await api.requireContentPreferences()).toEqual({ kidsMode: true });
  write.mockRestore();
  await api.selectKidsMode(false);
  expect(api.getContentPreferenceState()).toMatchObject({ kidsMode: false, error: null });
});

it("waits for a pending Kids mode commit before supplying a new word pool", async () => {
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
  const save = api.selectKidsMode(true);
  let supplied = false;
  const preference = api.requireContentPreferences().then((value) => {
    supplied = true;
    return value;
  });
  await Promise.resolve();
  expect(supplied).toBe(false);
  expect(api.getContentPreferenceState()).toMatchObject({ kidsMode: false, busy: true });
  finish();
  await save;
  expect(await preference).toEqual({ kidsMode: true });
});

it("blocks new selection when preferences cannot be read, preserves bytes and supports retry", async () => {
  const key = "rvlry.snapshot.app.content.v1";
  localStorage.setItem(key, "corrupt");
  const api = await import("./contentPreference");
  await expect(api.requireContentPreferences()).rejects.toThrow("Kids mode could not be loaded");
  await api.selectKidsMode(true);
  expect(localStorage.getItem(key)).toBe("corrupt");
  localStorage.removeItem(key);
  expect(await api.requireContentPreferences()).toEqual({ kidsMode: false });
});

it("recovers a previous valid preference rather than silently disabling Kids mode", async () => {
  let api = await import("./contentPreference");
  await api.initializeContentPreferences();
  await api.selectKidsMode(true);
  await api.selectKidsMode(false);
  const key = "rvlry.snapshot.app.content.v1";
  const pair = JSON.parse(localStorage.getItem(key)!);
  localStorage.setItem(key, JSON.stringify({ ...pair, current: "corrupt" }));
  vi.resetModules();
  api = await import("./contentPreference");
  expect(await api.requireContentPreferences()).toEqual({ kidsMode: true });
});
