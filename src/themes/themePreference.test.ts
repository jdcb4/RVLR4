import { beforeEach, expect, it, vi } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: () => ({}),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

it("defaults to Classic, restores all five choices, and leaves game saves untouched", async () => {
  localStorage.setItem("rvlry.snapshot.whowhatwhere.device-session.v1", "existing game bytes");
  let api = await import("./themePreference");
  await api.initializeTheme();
  expect(api.getThemeState().theme).toBe("classic");
  for (const theme of ["pub-trivia", "bookclub", "recess", "observatory", "classic"] as const) {
    await api.selectTheme(theme);
    vi.resetModules();
    api = await import("./themePreference");
    await api.initializeTheme();
    expect(document.documentElement.dataset.theme).toBe(theme);
    expect(api.getThemeState()).toMatchObject({ theme, loaded: true, error: null });
  }
  expect(localStorage.getItem("rvlry.snapshot.whowhatwhere.device-session.v1")).toBe(
    "existing game bytes",
  );
});

it("keeps the committed theme after a failed write and allows retry", async () => {
  const api = await import("./themePreference");
  await api.initializeTheme();
  await api.selectTheme("bookclub");
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
    throw new Error("full");
  });
  await api.selectTheme("recess");
  expect(api.getThemeState()).toMatchObject({ theme: "bookclub", busy: false });
  expect(api.getThemeState().error).toContain("could not be saved");
  write.mockRestore();
  await api.selectTheme("recess");
  expect(api.getThemeState()).toMatchObject({ theme: "recess", error: null });
});

it("preserves unreadable preferences, blocks replacement, and can retry loading", async () => {
  const key = "rvlry.snapshot.app.appearance.v1";
  localStorage.setItem(key, "unreadable");
  const api = await import("./themePreference");
  await api.initializeTheme();
  await api.selectTheme("recess");
  expect(api.getThemeState()).toMatchObject({ theme: "classic", loaded: false });
  expect(localStorage.getItem(key)).toBe("unreadable");
  localStorage.removeItem(key);
  await api.initializeTheme();
  expect(api.getThemeState()).toMatchObject({ loaded: true, error: null });
});

it("recovers the previous valid theme if the latest checkpoint is corrupt", async () => {
  let api = await import("./themePreference");
  await api.initializeTheme();
  await api.selectTheme("bookclub");
  await api.selectTheme("observatory");
  const key = "rvlry.snapshot.app.appearance.v1";
  const pair = JSON.parse(localStorage.getItem(key)!);
  localStorage.setItem(key, JSON.stringify({ ...pair, current: "corrupt" }));
  vi.resetModules();
  api = await import("./themePreference");
  await api.initializeTheme();
  expect(api.getThemeState()).toMatchObject({ theme: "bookclub", loaded: true });
});
