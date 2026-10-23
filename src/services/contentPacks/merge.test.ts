import { expect, it } from "vitest";

import { type CatalogueEntry } from "../../data/catalogueSchema";
import bundledTrivia from "../../data/trivia/bundled.json";
import { triviaPackSchema } from "../../data/triviaSchema";
import { mergeContentPacks, reconcileBundledPack } from "./merge";
import { wordId, wordsPackSchema } from "./schema";

const word = (name: string): CatalogueEntry => ({
  word: name,
  category: "What",
  hint: "A synthetic fixture.",
  difficulty: "easy",
  kidAppropriate: true,
  kidTargeted: false,
  aliases: [],
  originalIds: [],
  games: ["www", "hat", "imposter"],
});
const words = (version: number, entries: CatalogueEntry[], removedIds: string[] = []) =>
  wordsPackSchema.parse({
    schemaVersion: 1,
    kind: "words",
    version,
    publishedAt: "2026-10-23T00:00:00.000Z",
    entries,
    removedIds,
  });
const question = bundledTrivia.questions[0]!;
const trivia = (version: number, questions: unknown[], removedIds: string[] = []) =>
  triviaPackSchema.parse({
    schemaVersion: 1,
    kind: "trivia",
    version,
    publishedAt: "2026-10-23T00:00:00.000Z",
    questions,
    removedIds,
  });

it("upserts a one-entry batch while retaining all omitted records in both kinds", () => {
  const previous = words(1, [word("Alpha"), word("Beta")]);
  const next = words(2, [{ ...word("Alpha"), hint: "Corrected hint." }]);
  expect(mergeContentPacks(previous, next)).toMatchObject({
    version: 2,
    entries: [{ word: "Alpha", hint: "Corrected hint." }, { word: "Beta" }],
  });
  const second = { ...question, id: "trivia:second", question: "A separate fixture question?" };
  expect(mergeContentPacks(trivia(1, [question]), trivia(2, [second]))).toMatchObject({
    questions: [question, second],
  });
  expect(previous.entries[0]!.hint).toBe("A synthetic fixture.");
});

it("keeps explicit tombstones forever, including when app upgrades bundle deleted records", () => {
  const deleted = mergeContentPacks(words(2, [word("Alpha")]), words(3, [], [wordId("Alpha")]));
  expect(deleted).toMatchObject({ entries: [], removedIds: ["word:alpha"] });
  const upgrade = reconcileBundledPack(words(10, [word("Alpha"), word("Beta")]), deleted);
  expect(upgrade).toMatchObject({
    version: 10,
    entries: [word("Beta")],
    removedIds: ["word:alpha"],
  });
  expect(() => mergeContentPacks(deleted, words(11, [word("Alpha")]))).toThrow(
    "cannot be restored",
  );
  const deletedQuestion = mergeContentPacks(trivia(2, [question]), trivia(3, [], [question.id]));
  expect(reconcileBundledPack(trivia(10, [question]), deletedQuestion)).toMatchObject({
    questions: [],
    removedIds: [question.id],
  });
  expect(() => mergeContentPacks(deletedQuestion, trivia(11, [question]))).toThrow(
    "cannot be restored",
  );
});

it("preserves installed word corrections and additions while accepting new bundled entries", () => {
  const installed = words(2, [{ ...word("Alpha"), hint: "Installed correction." }, word("Gamma")]);
  const result = reconcileBundledPack(words(5, [word("Alpha"), word("Beta")]), installed);
  expect(result).toMatchObject({
    version: 5,
    entries: [
      { word: "Alpha", hint: "Installed correction." },
      { word: "Beta" },
      { word: "Gamma" },
    ],
  });
});

it("uses stable normalised word IDs, and explicit removal plus addition for a rename", () => {
  expect(wordId("Café - Alpha")).toBe("word:cafealpha");
  const renamed = mergeContentPacks(
    words(1, [word("Alpha")]),
    words(2, [word("Beta")], [wordId("Alpha")]),
  );
  expect(renamed).toMatchObject({ entries: [word("Beta")], removedIds: ["word:alpha"] });
});

it("rejects canonical names, aliases and provenance collisions across the final merged pool", () => {
  const previous = words(1, [{ ...word("Alpha"), aliases: ["Aleph"], originalIds: ["www:1"] }]);
  expect(() =>
    mergeContentPacks(previous, words(2, [{ ...word("Beta"), aliases: ["ALEPH!"] }])),
  ).toThrow("also belongs");
  expect(() => mergeContentPacks(previous, words(2, [word("Aleph")]))).toThrow("also belongs");
  expect(() =>
    mergeContentPacks(previous, words(2, [{ ...word("Beta"), originalIds: ["www:1"] }])),
  ).toThrow("assigned more than once");
});

it("rejects Trivia text duplication across IDs and conflicting or regressing revisions", () => {
  const previous = trivia(1, [question]);
  expect(() =>
    mergeContentPacks(previous, trivia(2, [{ ...question, id: "trivia:duplicate" }])),
  ).toThrow("Duplicate ID or question text");
  expect(() =>
    mergeContentPacks(previous, trivia(2, [{ ...question, answer: "Changed" }])),
  ).toThrow("revision");
  const corrected = trivia(2, [{ ...question, revision: 3, answer: "Corrected" }]);
  expect(() => mergeContentPacks(corrected, trivia(3, [{ ...question, revision: 2 }]))).toThrow(
    "revision",
  );
  expect(mergeContentPacks(previous, corrected)).toMatchObject({
    questions: [{ revision: 3, answer: "Corrected" }],
  });
  expect(mergeContentPacks(previous, trivia(2, [question]))).toMatchObject({
    questions: [question],
  });
});

it("uses the highest Trivia revision when reconciling bundled and installed versions", () => {
  const corrected = { ...question, revision: question.revision + 1, answer: "Correction" };
  expect(reconcileBundledPack(trivia(10, [corrected]), trivia(2, [question]))).toMatchObject({
    questions: [corrected],
  });
  expect(reconcileBundledPack(trivia(1, [question]), trivia(2, [corrected]))).toMatchObject({
    questions: [corrected],
  });
  expect(() =>
    reconcileBundledPack(
      trivia(1, [question]),
      trivia(2, [{ ...question, answer: "Unversioned correction" }]),
    ),
  ).toThrow("revision");
});

it("validates unique correctly formed removals and rejects same-batch upsert/removal", () => {
  expect(wordsPackSchema.safeParse({ ...words(1, []), removedIds: ["word:Alpha"] }).success).toBe(
    false,
  );
  expect(
    wordsPackSchema.safeParse({ ...words(1, []), removedIds: ["word:alpha", "word:alpha"] })
      .success,
  ).toBe(false);
  expect(
    wordsPackSchema.safeParse({ ...words(1, [word("Alpha")]), removedIds: ["word:alpha"] }).success,
  ).toBe(false);
  expect(triviaPackSchema.safeParse({ ...trivia(1, []), removedIds: ["word:alpha"] }).success).toBe(
    false,
  );
  expect(
    triviaPackSchema.safeParse({ ...trivia(1, []), removedIds: [question.id, question.id] })
      .success,
  ).toBe(false);
  expect(
    triviaPackSchema.safeParse({ ...trivia(1, [question]), removedIds: [question.id] }).success,
  ).toBe(false);
  expect(() => mergeContentPacks(words(1, []), trivia(2, []))).toThrow("different content kinds");
});

it("accepts legacy packs without removedIds as additive batches", () => {
  expect(wordsPackSchema.parse({ ...words(1, []), removedIds: undefined }).removedIds).toEqual([]);
  expect(triviaPackSchema.parse({ ...trivia(1, []), removedIds: undefined }).removedIds).toEqual(
    [],
  );
});
