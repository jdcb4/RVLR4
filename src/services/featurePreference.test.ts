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

it("defaults off, persists Trivia visibility independently and restores it on startup", async () => {
  localStorage.setItem("rvlry.snapshot.whowhatwhere.device-session.v1", "saved game");
  let api = await import("./featurePreference");
  expect(await api.requireFeaturePreferences()).toEqual({ triviaEnabled: false });
  await api.selectTriviaEnabled(true);
  vi.resetModules();
  api = await import("./featurePreference");
  expect(await api.requireFeaturePreferences()).toEqual({ triviaEnabled: true });
  expect(localStorage.getItem("rvlry.snapshot.whowhatwhere.device-session.v1")).toBe("saved game");
});

it("keeps the committed choice after a failed write and allows retry", async () => {
  const api = await import("./featurePreference");
  await api.initializeFeaturePreferences();
  await api.selectTriviaEnabled(true);
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
    throw new Error("full");
  });
  await api.selectTriviaEnabled(false);
  expect(api.getFeaturePreferenceState()).toMatchObject({ triviaEnabled: true, busy: false });
  expect(api.getFeaturePreferenceState().error).toContain("could not be saved");
  expect(await api.requireFeaturePreferences()).toEqual({ triviaEnabled: true });
  write.mockRestore();
  await api.selectTriviaEnabled(false);
  expect(api.getFeaturePreferenceState()).toMatchObject({ triviaEnabled: false, error: null });
});

it("waits for a pending Trivia visibility commit before supplying a new word pool", async () => {
  const store = await import("./nativeSnapshotStore");
  const api = await import("./featurePreference");
  await api.initializeFeaturePreferences();
  let finish!: () => void;
  vi.spyOn(store, "writeSnapshot").mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const save = api.selectTriviaEnabled(true);
  let supplied = false;
  const preference = api.requireFeaturePreferences().then((value) => {
    supplied = true;
    return value;
  });
  await Promise.resolve();
  expect(supplied).toBe(false);
  expect(api.getFeaturePreferenceState()).toMatchObject({ triviaEnabled: false, busy: true });
  finish();
  await save;
  expect(await preference).toEqual({ triviaEnabled: true });
});

it("blocks new selection when preferences cannot be read, preserves bytes and supports retry", async () => {
  const key = "rvlry.snapshot.app.features.v1";
  localStorage.setItem(key, "corrupt");
  const api = await import("./featurePreference");
  await expect(api.requireFeaturePreferences()).rejects.toThrow(
    "Trivia visibility could not be loaded",
  );
  await api.selectTriviaEnabled(true);
  expect(localStorage.getItem(key)).toBe("corrupt");
  localStorage.removeItem(key);
  expect(await api.requireFeaturePreferences()).toEqual({ triviaEnabled: false });
});

it("recovers a previous valid preference rather than silently disabling Trivia visibility", async () => {
  let api = await import("./featurePreference");
  await api.initializeFeaturePreferences();
  await api.selectTriviaEnabled(true);
  await api.selectTriviaEnabled(false);
  const key = "rvlry.snapshot.app.features.v1";
  const pair = JSON.parse(localStorage.getItem(key)!);
  localStorage.setItem(key, JSON.stringify({ ...pair, current: "corrupt" }));
  vi.resetModules();
  api = await import("./featurePreference");
  expect(await api.requireFeaturePreferences()).toEqual({ triviaEnabled: true });
});
