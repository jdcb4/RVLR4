import { afterEach, expect, it, vi } from "vitest";

import {
  getCatalogueForGame,
  getWordCatalogue,
  setActiveWordCatalogue,
} from "@/data/wordCatalogue";
import { loadWordsCatalogue } from "@/services/contentPacks/store";
import { initializeContentPreferences } from "@/services/contentPreference";
import { initializeTheme } from "@/themes/themePreference";

import { initializeApp } from "./initializeApp";

vi.mock("@/services/contentPreference", () => ({
  initializeContentPreferences: vi.fn(async () => {}),
}));
vi.mock("@/themes/themePreference", () => ({ initializeTheme: vi.fn(async () => {}) }));
vi.mock("@/services/contentPacks/store", () => ({ loadWordsCatalogue: vi.fn() }));

afterEach(() => {
  setActiveWordCatalogue(getWordCatalogue());
  vi.clearAllMocks();
});

it("keeps startup pending until locally installed words are activated", async () => {
  const entries = [
    { ...getWordCatalogue()[0]!, word: "Locally installed clue", aliases: [], originalIds: [] },
  ];
  let resolve!: (value: Awaited<ReturnType<typeof loadWordsCatalogue>>) => void;
  vi.mocked(loadWordsCatalogue).mockReturnValue(
    new Promise((complete) => {
      resolve = complete;
    }),
  );
  let ready = false;
  const startup = initializeApp().then(() => {
    ready = true;
  });
  await Promise.resolve();
  expect(ready).toBe(false);
  expect(initializeTheme).toHaveBeenCalledOnce();
  expect(initializeContentPreferences).toHaveBeenCalledOnce();
  resolve({
    pack: {
      schemaVersion: 1,
      kind: "words",
      version: 2,
      publishedAt: "2026-10-23T00:00:00Z",
      removedIds: [],
      entries,
    },
    source: "current",
    warning: null,
  });
  await startup;
  expect(ready).toBe(true);
  expect(getCatalogueForGame(entries[0]!.games[0]!)).toEqual(entries);
});

it("activates the validated bundled fallback when installed content is unavailable", async () => {
  setActiveWordCatalogue([]);
  const entries = [...getWordCatalogue()];
  vi.mocked(loadWordsCatalogue).mockResolvedValue({
    pack: {
      schemaVersion: 1,
      kind: "words",
      version: 1,
      publishedAt: "2026-10-23T00:00:00Z",
      removedIds: [],
      entries,
    },
    source: "bundled",
    warning: "Installed content is unavailable.",
  });
  await initializeApp();
  expect(getCatalogueForGame("www").length).toBeGreaterThan(0);
});
