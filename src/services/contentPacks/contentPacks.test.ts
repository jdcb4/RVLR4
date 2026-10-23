import { webcrypto } from "node:crypto";

import { beforeEach, expect, it, vi } from "vitest";

import bundled from "../../data/trivia/bundled.json";
import { isTriviaQuestionEligible, triviaPackSchema } from "../../data/triviaSchema";
import { checkContentUpdates, downloadContentPack } from "./download";
import { bundledWordsPack } from "./merge";
import {
  contentManifestSchema,
  type PackDescriptor,
  sha256,
  validateDownload,
  wordId,
} from "./schema";
import {
  installContentPack,
  installTriviaPack,
  loadTriviaCatalogue,
  loadWordsCatalogue,
} from "./store";

const bridge = vi.hoisted(() => ({ native: false, readContent: vi.fn(), installContent: vi.fn() }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => bridge.native },
  registerPlugin: () => bridge,
}));

const question = {
  id: "trivia:test-question",
  revision: 1,
  question: "Which planet does the synthetic content-update fixture identify?",
  answer: "Mars",
  acceptableAnswers: [],
  category: "science-nature" as const,
  difficulty: "easy" as const,
  kidAppropriate: true,
  review: {
    reviewedAt: "2026-10-22T00:00:00.000Z",
    reviewer: "Test fixture only",
    sources: ["https://example.com/fixture"],
  },
};
const pack = (version: number) => ({
  schemaVersion: 1,
  kind: "trivia",
  version: bundled.version + version,
  publishedAt: "2026-10-22T00:00:00.000Z",
  questions: [structuredClone(question)],
});
async function download(value: unknown) {
  const raw = JSON.stringify(value);
  const bytes = new TextEncoder().encode(raw);
  const descriptor: PackDescriptor = {
    kind: (value as { kind: PackDescriptor["kind"] }).kind,
    version: (value as { version: number }).version,
    url: "https://example.com/trivia.json",
    bytes: bytes.byteLength,
    sha256: await sha256(bytes),
  };
  return { raw, bytes, descriptor };
}
async function install(value: unknown) {
  const { bytes, descriptor } = await download(value);
  await installTriviaPack(bytes, descriptor);
}
const storageKey = "rvlry.content.trivia";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.stubGlobal("crypto", webcrypto);
  bridge.native = false;
  bridge.readContent.mockReset();
  bridge.installContent.mockReset();
  localStorage.clear();
});

it("loads the curated starter bank from the APK without requiring a download", async () => {
  expect(await loadTriviaCatalogue()).toMatchObject({
    pack: { version: bundled.version },
    source: "bundled",
    warning: null,
  });
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await loadTriviaCatalogue();
  expect(fetch).not.toHaveBeenCalled();
  fetch.mockResolvedValue(new Response(JSON.stringify({ schemaVersion: 1, packs: [] })));
  expect(await checkContentUpdates()).toEqual({
    status: "available",
    manifest: { schemaVersion: 1, packs: [] },
  });
});

it("installs independently of word content and games, and reloads without shared mutable records", async () => {
  localStorage.setItem("rvlry.snapshot.whowhatwhere.device-session.v1", "saved game");
  localStorage.setItem("rvlry.content.words", "word pack");
  await install(pack(3));
  const first = await loadTriviaCatalogue();
  first.pack.questions.find((entry) => entry.id === question.id)!.answer = "Changed by caller";
  expect(
    (await loadTriviaCatalogue()).pack.questions.find((entry) => entry.id === question.id)!.answer,
  ).toBe("Mars");
  expect(localStorage.getItem("rvlry.snapshot.whowhatwhere.device-session.v1")).toBe("saved game");
  expect(localStorage.getItem("rvlry.content.words")).toBe("word pack");
});

it("rejects truncated, altered and version-mismatched downloads without replacing content", async () => {
  await install(pack(3));
  const old = localStorage.getItem(storageKey);
  const { bytes, descriptor } = await download(pack(4));
  await expect(installTriviaPack(bytes.slice(0, -1), descriptor)).rejects.toThrow("checksum");
  const modified = new Uint8Array(bytes);
  modified[0] = 32;
  await expect(installTriviaPack(modified, descriptor)).rejects.toThrow("checksum");
  await expect(
    installTriviaPack(bytes, { ...descriptor, version: bundled.version + 5 }),
  ).rejects.toThrow("version");
  expect(localStorage.getItem(storageKey)).toBe(old);
});

it("rejects duplicate questions, IDs, answer variants and unsupported schemas", () => {
  const duplicate = pack(3);
  duplicate.questions.push({
    ...question,
    id: "trivia:another",
    question: "Which planet does the synthetic content-update FIXTURE identify!",
  });
  expect(triviaPackSchema.safeParse(duplicate).success).toBe(false);
  duplicate.questions[1]!.question = "Something else?";
  duplicate.questions[1]!.id = question.id;
  expect(triviaPackSchema.safeParse(duplicate).success).toBe(false);
  expect(triviaPackSchema.safeParse({ ...pack(3), schemaVersion: 2 }).success).toBe(false);
  expect(
    triviaPackSchema.safeParse({
      ...pack(3),
      questions: [{ ...question, acceptableAnswers: ["MARS"] }],
    }).success,
  ).toBe(false);
  expect(
    triviaPackSchema.safeParse({ ...pack(3), questions: [{ ...question, review: undefined }] })
      .success,
  ).toBe(false);
});

it("requires newer packs and increased revisions; omission retains records and explicit removal persists", async () => {
  await install(pack(3));
  await expect(install(pack(3))).rejects.toThrow("newer");
  const changed = pack(4);
  changed.questions[0]!.answer = "Venus";
  await expect(install(changed)).rejects.toThrow("revision");
  changed.questions[0]!.revision++;
  await install(changed);
  await install({ ...pack(5), questions: [] });
  expect(
    (await loadTriviaCatalogue()).pack.questions.find((entry) => entry.id === question.id)?.answer,
  ).toBe("Venus");
  await install({ ...pack(6), questions: [], removedIds: [question.id] });
  const result = (await loadTriviaCatalogue()).pack;
  expect(result.questions.find((entry) => entry.id === question.id)).toBeUndefined();
  expect(result.questions).toHaveLength(bundled.questions.length);
  expect(result.removedIds).toContain(question.id);
});

it("recovers previous content and preserves it when replacing a corrupt current pack", async () => {
  await install(pack(3));
  await install(pack(4));
  const pair = JSON.parse(localStorage.getItem(storageKey)!);
  localStorage.setItem(storageKey, JSON.stringify({ ...pair, current: "corrupt" }));
  expect(await loadTriviaCatalogue()).toMatchObject({
    source: "previous",
    pack: { version: bundled.version + 3 },
  });
  await install(pack(5));
  expect(JSON.parse(localStorage.getItem(storageKey)!).previous).toBe(pair.previous);
});

it("retains good content on write failure and never treats a failed read as an empty database", async () => {
  await install(pack(3));
  const old = localStorage.getItem(storageKey);
  vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
    throw new Error("Disk full");
  });
  await expect(install(pack(4))).rejects.toThrow("Disk full");
  expect(localStorage.getItem(storageKey)).toBe(old);
  vi.spyOn(Storage.prototype, "getItem").mockImplementationOnce(() => {
    throw new Error("Cannot read");
  });
  await expect(install(pack(4))).rejects.toThrow("Cannot read");
  await install(pack(4));
});

it("preserves unsupported installed content and blocks accidental downgrade", async () => {
  const raw = JSON.stringify({ ...pack(10), schemaVersion: 2 });
  localStorage.setItem(storageKey, JSON.stringify({ current: raw, previous: null }));
  expect((await loadTriviaCatalogue()).warning).toBeTruthy();
  await expect(install(pack(11))).rejects.toThrow("compatible");
  expect(JSON.parse(localStorage.getItem(storageKey)!).current).toBe(raw);
});

it("serializes competing installations so a slower old pack cannot replace a newer one", async () => {
  const newer = await download(pack(5)),
    older = await download(pack(4));
  const results = await Promise.allSettled([
    installTriviaPack(newer.bytes, newer.descriptor),
    installTriviaPack(older.bytes, older.descriptor),
  ]);
  expect(results.map((result) => result.status)).toEqual(["fulfilled", "rejected"]);
  expect((await loadTriviaCatalogue()).pack.version).toBe(bundled.version + 5);
});

it("passes the exact checkpoint to native CAS and does not acknowledge a failed native commit", async () => {
  bridge.native = true;
  const prior = await download(pack(3));
  bridge.readContent.mockResolvedValue({ current: prior.raw, previous: null });
  bridge.installContent.mockRejectedValueOnce(new Error("CONTENT_CONFLICT"));
  await expect(install(pack(4))).rejects.toThrow("CONTENT_CONFLICT");
  expect(bridge.installContent).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: "trivia",
      expectedCurrent: prior.raw,
      retainedPrevious: prior.raw,
    }),
  );
  expect((await loadTriviaCatalogue()).pack.version).toBe(bundled.version + 3);
});

it("retains lower-version installed additions and tombstones after an APK bundle upgrade", async () => {
  const raw = JSON.stringify({ ...pack(1), version: 1, removedIds: [bundled.questions[0]!.id] });
  localStorage.setItem(storageKey, JSON.stringify({ current: raw, previous: null }));
  const loaded = await loadTriviaCatalogue();
  expect(loaded.source).toBe("current");
  expect(loaded.warning).toBeNull();
  expect(loaded.pack.version).toBe(bundled.version);
  expect(loaded.pack.questions).toHaveLength(bundled.questions.length);
  expect(loaded.pack.questions.some((entry) => entry.id === question.id)).toBe(true);
  expect(loaded.pack.questions.some((entry) => entry.id === bundled.questions[0]!.id)).toBe(false);
  await install({ ...pack(2), questions: [] });
  const reloaded = (await loadTriviaCatalogue()).pack;
  expect(reloaded.questions.some((entry) => entry.id === question.id)).toBe(true);
  expect(reloaded.removedIds).toEqual([bundled.questions[0]!.id]);
});

it("installs word additions, corrections and removals independently with durable tombstones", async () => {
  const addition = {
    ...bundledWordsPack.entries[0]!,
    word: "Synthetic content fixture alpha",
    aliases: [],
    originalIds: [],
  };
  const makeWords = (version: number, entries: unknown[], removedIds: string[] = []) => ({
    schemaVersion: 1,
    kind: "words",
    version,
    publishedAt: "2026-10-23T00:00:00.000Z",
    entries,
    removedIds,
  });
  const installWords = async (value: unknown) => {
    const { bytes, descriptor } = await download(value);
    await installContentPack(bytes, descriptor);
  };
  await install(pack(1));
  const triviaBefore = localStorage.getItem(storageKey);
  expect((await loadWordsCatalogue()).source).toBe("bundled");
  await installWords(makeWords(2, [addition]));
  expect((await loadWordsCatalogue()).pack.entries).toHaveLength(
    bundledWordsPack.entries.length + 1,
  );
  const corrected = { ...addition, hint: "Updated description." };
  await installWords(makeWords(3, [corrected]));
  expect(
    (await loadWordsCatalogue()).pack.entries.find((entry) => entry.word === addition.word)?.hint,
  ).toBe("Updated description.");
  await installWords(
    makeWords(4, [], [wordId(addition.word), wordId(bundledWordsPack.entries[0]!.word)]),
  );
  const removed = (await loadWordsCatalogue()).pack;
  expect(removed.entries).toHaveLength(bundledWordsPack.entries.length - 1);
  expect(removed.removedIds).toHaveLength(2);
  await installWords(makeWords(5, []));
  expect((await loadWordsCatalogue()).pack.removedIds).toEqual(removed.removedIds);
  await expect(installWords(makeWords(6, [addition]))).rejects.toThrow("cannot be restored");
  await expect(installWords(makeWords(5, []))).rejects.toThrow("newer");
  expect(localStorage.getItem(storageKey)).toBe(triviaBefore);
});

it("rejects final-pool word alias collisions before atomic storage changes", async () => {
  const baseline = bundledWordsPack.entries[0]!;
  const value = {
    ...bundledWordsPack,
    version: 2,
    entries: [
      {
        ...baseline,
        word: "Synthetic word collision fixture",
        aliases: [baseline.word],
        originalIds: [],
      },
    ],
  };
  const { bytes, descriptor } = await download(value);
  await expect(installContentPack(bytes, descriptor)).rejects.toThrow("also belongs");
  expect(localStorage.getItem("rvlry.content.words")).toBeNull();
});

it("preserves every checkpoint when a merged catalogue exceeds the native 8 MiB bound", async () => {
  const largePack = (prefix: string, version: number) => ({
    ...pack(version),
    questions: Array.from({ length: 3400 }, (_, index) => ({
      ...question,
      id: `trivia:${prefix}-${index}`,
      question: `Synthetic ${prefix} fixture number ${index}?`,
      explanation: "x".repeat(1000),
    })),
  });
  const prior = JSON.stringify(largePack("prior", 1));
  localStorage.setItem(storageKey, JSON.stringify({ current: prior, previous: null }));
  const before = localStorage.getItem(storageKey);
  await expect(install(largePack("incoming", 2))).rejects.toThrow("8 MiB");
  expect(localStorage.getItem(storageKey)).toBe(before);
});

it("expiry is exclusive, evaluated again on resume, and combined with kids/difficulty filters", () => {
  const current = { ...question, expiresAt: "2026-10-23T00:00:00.000Z" };
  const end = Date.parse(current.expiresAt);
  expect(isTriviaQuestionEligible(current, { kidsMode: true }, end - 1)).toBe(true);
  expect(isTriviaQuestionEligible(current, { kidsMode: true }, end)).toBe(false);
  expect(isTriviaQuestionEligible(question, { kidsMode: true }, end + 9999)).toBe(true);
  expect(
    isTriviaQuestionEligible({ ...question, kidAppropriate: false }, { kidsMode: true }, end),
  ).toBe(false);
  expect(isTriviaQuestionEligible(question, { kidsMode: false, difficulty: "hard" }, end)).toBe(
    true,
  );
});

it("manifest keeps word and Trivia versions independent, rejects duplicates and insecure URLs", async () => {
  const { descriptor } = await download(pack(3));
  expect(
    contentManifestSchema.safeParse({
      schemaVersion: 1,
      packs: [descriptor, { ...descriptor, kind: "words", version: 7 }],
    }).success,
  ).toBe(true);
  expect(
    contentManifestSchema.safeParse({ schemaVersion: 1, packs: [descriptor, descriptor] }).success,
  ).toBe(false);
  expect(
    contentManifestSchema.safeParse({
      schemaVersion: 1,
      packs: [{ ...descriptor, url: "http://example.com" }],
    }).success,
  ).toBe(false);
});

it("bounds streamed downloads even when a server omits content length", async () => {
  const { descriptor } = await download(pack(3));
  const cancel = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      body: {
        getReader: () => ({
          read: async () => ({ value: new Uint8Array(descriptor.bytes + 1), done: false }),
          cancel,
        }),
      },
    }),
  );
  await expect(downloadContentPack(descriptor)).rejects.toThrow("too large");
  expect(cancel).toHaveBeenCalled();
});

it("rejects invalid UTF-8 even when its advertised hash matches", async () => {
  const bytes = new Uint8Array([255]);
  const { descriptor } = await download(pack(3));
  await expect(
    validateDownload(bytes, { ...descriptor, bytes: 1, sha256: await sha256(bytes) }),
  ).rejects.toThrow();
});
