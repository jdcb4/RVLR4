import { webcrypto } from "node:crypto";

import { afterEach, expect, it, vi } from "vitest";

import { bundledWordsPack } from "./merge";
import { assemblePublications, publicationAsset } from "./publication";
import { validateDownload, wordId, wordsPackSchema } from "./schema";

afterEach(() => vi.unstubAllGlobals());

it("publishes cumulative history even when a batch contains just one word", async () => {
  const first = bundledWordsPack.entries[0]!;
  const second = bundledWordsPack.entries[1]!;
  const base = wordsPackSchema.parse({ ...bundledWordsPack, entries: [first, second] });
  const add = wordsPackSchema.parse({
    ...base,
    version: 2,
    entries: [{ ...first, originalIds: [], aliases: [], word: "Publication fixture" }],
  });
  const remove = wordsPackSchema.parse({
    ...base,
    version: 3,
    entries: [],
    removedIds: [wordId(first.word)],
  });
  const [result] = assemblePublications([base], [remove, add]);
  expect(result?.kind === "words" && result.entries.map((entry) => entry.word)).toEqual([
    second.word,
    "Publication fixture",
  ]);
  expect(result?.removedIds).toEqual([wordId(first.word)]);
  vi.stubGlobal("crypto", webcrypto);
  const asset = await publicationAsset(result!, "https://example.com/v1/");
  expect((await validateDownload(asset.bytes, asset.descriptor)).pack).toEqual(result);
});

it("rejects reused versions instead of silently publishing ambiguous history", () => {
  expect(() => assemblePublications([bundledWordsPack], [bundledWordsPack])).toThrow(
    "unique newer",
  );
});
