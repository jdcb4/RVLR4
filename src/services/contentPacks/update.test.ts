import { beforeEach, expect, it, vi } from "vitest";

import { setActiveWordCatalogue } from "../../data/wordCatalogue";
import { checkContentUpdates, downloadContentPack } from "./download";
import { installContentPack, loadTriviaCatalogue, loadWordsCatalogue } from "./store";
import { updateContent } from "./update";

vi.mock("./download", () => ({ checkContentUpdates: vi.fn(), downloadContentPack: vi.fn() }));
vi.mock("./store", () => ({
  installContentPack: vi.fn(),
  loadTriviaCatalogue: vi.fn(),
  loadWordsCatalogue: vi.fn(),
}));
vi.mock("../../data/wordCatalogue", () => ({ setActiveWordCatalogue: vi.fn() }));

const words = {
  kind: "words" as const,
  version: 2,
  url: "https://example.com/words.json",
  bytes: 1,
  sha256: "a".repeat(64),
};
const trivia = { ...words, kind: "trivia" as const, version: 6 };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(checkContentUpdates).mockResolvedValue({
    status: "available",
    manifest: { schemaVersion: 1, packs: [words, trivia] },
  });
  vi.mocked(loadWordsCatalogue).mockResolvedValue({
    pack: {
      schemaVersion: 1,
      kind: "words",
      version: 1,
      publishedAt: "2026-10-23T00:00:00.000Z",
      entries: [],
      removedIds: [],
    },
    source: "bundled",
    warning: null,
  });
  vi.mocked(loadTriviaCatalogue).mockResolvedValue({
    pack: {
      schemaVersion: 1,
      kind: "trivia",
      version: 5,
      publishedAt: "2026-10-23T00:00:00.000Z",
      questions: [],
      removedIds: [],
    },
    source: "bundled",
    warning: null,
  });
  vi.mocked(downloadContentPack).mockResolvedValue(new Uint8Array([1]));
});

it("deduplicates simultaneous checks, installs independently and activates words after commit", async () => {
  const first = updateContent();
  expect(updateContent()).toBe(first);
  expect(await first).toEqual({ updated: ["words", "trivia"], failures: [] });
  expect(checkContentUpdates).toHaveBeenCalledTimes(1);
  expect(installContentPack).toHaveBeenCalledTimes(2);
  expect(setActiveWordCatalogue).toHaveBeenCalledTimes(1);
  expect(vi.mocked(setActiveWordCatalogue).mock.invocationCallOrder[0]).toBeGreaterThan(
    vi.mocked(installContentPack).mock.invocationCallOrder[0]!,
  );
});

it("keeps a successful catalogue update if the other fails and allows retry", async () => {
  vi.mocked(installContentPack).mockRejectedValueOnce(new Error("disk full"));
  expect(await updateContent()).toEqual({ updated: ["trivia"], failures: ["words"] });
  expect(setActiveWordCatalogue).not.toHaveBeenCalled();
  expect(await updateContent()).toEqual({ updated: ["words", "trivia"], failures: [] });
});

it("does not download repeated or older packs", async () => {
  vi.mocked(checkContentUpdates).mockResolvedValue({
    status: "available",
    manifest: {
      schemaVersion: 1,
      packs: [
        { ...words, version: 1 },
        { ...trivia, version: 4 },
      ],
    },
  });
  expect(await updateContent()).toEqual({ updated: [], failures: [] });
  expect(downloadContentPack).not.toHaveBeenCalled();
  expect(installContentPack).not.toHaveBeenCalled();
});

it("leaves installed data alone when the manifest cannot be fetched", async () => {
  vi.mocked(checkContentUpdates).mockRejectedValue(new Error("offline"));
  await expect(updateContent()).rejects.toThrow("offline");
  expect(installContentPack).not.toHaveBeenCalled();
  vi.mocked(checkContentUpdates).mockResolvedValue({
    status: "available",
    manifest: { schemaVersion: 1, packs: [] },
  });
  expect(await updateContent()).toEqual({ updated: [], failures: [] });
});

it("retries activation after a committed word update whose read initially failed", async () => {
  const current = await loadWordsCatalogue();
  vi.mocked(loadWordsCatalogue)
    .mockResolvedValueOnce(current)
    .mockRejectedValueOnce(new Error("temporary read failure"));
  expect((await updateContent()).failures).toEqual(["words"]);
  expect(setActiveWordCatalogue).not.toHaveBeenCalled();
  vi.mocked(loadWordsCatalogue).mockResolvedValue({
    ...current,
    pack: { ...current.pack, version: words.version },
    source: "current",
  });
  vi.mocked(installContentPack).mockClear();
  expect((await updateContent()).failures).toEqual([]);
  expect(setActiveWordCatalogue).toHaveBeenCalledTimes(1);
  expect(installContentPack).not.toHaveBeenCalledWith(expect.anything(), words);
});
