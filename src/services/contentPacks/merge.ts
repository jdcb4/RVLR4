import kids from "../../data/catalogue/kids.json";
import what from "../../data/catalogue/what.json";
import where from "../../data/catalogue/where.json";
import who from "../../data/catalogue/who.json";
import { triviaPackSchema } from "../../data/triviaSchema";
import { type ContentPack, wordId, type WordsPack, wordsPackSchema } from "./schema";

export const bundledWordsPack: WordsPack = wordsPackSchema.parse({
  schemaVersion: 1,
  kind: "words",
  version: 1,
  publishedAt: "2026-10-23T00:00:00.000Z",
  entries: [...who, ...what, ...where, ...kids],
});

function merge(previous: ContentPack, incoming: ContentPack, bundled: boolean): ContentPack {
  if (previous.kind !== incoming.kind) throw new Error("Cannot merge different content kinds.");
  const removedIds = [...new Set([...previous.removedIds, ...incoming.removedIds])];
  const removed = new Set(removedIds);
  const header = {
    schemaVersion: 1 as const,
    version: Math.max(previous.version, incoming.version),
    publishedAt: incoming.version >= previous.version ? incoming.publishedAt : previous.publishedAt,
    removedIds,
  };
  if (previous.kind === "words" && incoming.kind === "words") {
    const entries = new Map(previous.entries.map((entry) => [wordId(entry.word), entry]));
    for (const entry of incoming.entries) {
      const id = wordId(entry.word);
      if (!bundled && removed.has(id)) throw new Error(`Removed ID ${id} cannot be restored.`);
      entries.set(id, entry);
    }
    return wordsPackSchema.parse({
      ...header,
      kind: "words",
      entries: [...entries].filter(([id]) => !removed.has(id)).map(([, entry]) => entry),
    });
  }
  if (previous.kind === "trivia" && incoming.kind === "trivia") {
    const questions = new Map(previous.questions.map((question) => [question.id, question]));
    for (const question of incoming.questions) {
      if (!bundled && removed.has(question.id))
        throw new Error(`Removed ID ${question.id} cannot be restored.`);
      const before = questions.get(question.id);
      if (before) {
        if (
          question.revision === before.revision &&
          JSON.stringify(question) !== JSON.stringify(before)
        )
          throw new Error(`Question ${question.id} changed without an increased revision.`);
        if (question.revision < before.revision) {
          if (bundled) continue;
          throw new Error(`Question ${question.id} changed without an increased revision.`);
        }
      }
      questions.set(question.id, question);
    }
    return triviaPackSchema.parse({
      ...header,
      kind: "trivia",
      questions: [...questions.values()].filter((question) => !removed.has(question.id)),
    });
  }
  throw new Error("Cannot merge different content kinds.");
}

/** Published packs are upsert batches; omission never removes an installed record. */
export function mergeContentPacks(previous: ContentPack, incoming: ContentPack): ContentPack {
  return merge(previous, incoming, false);
}

/** App upgrades retain installed additions/tombstones and prefer the highest Trivia revision. */
export function reconcileBundledPack(bundled: ContentPack, installed: ContentPack): ContentPack {
  return merge(bundled, installed, true);
}
