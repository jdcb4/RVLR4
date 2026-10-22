import { Capacitor } from "@capacitor/core";
import { z } from "zod";

import bundledTrivia from "../../data/trivia/bundled.json";
import { triviaPackSchema } from "../../data/triviaSchema";
import { deviceBridge } from "../nativeSnapshotStore";
import {
  type ContentPack,
  type PackDescriptor,
  type PackKind,
  parsePack,
  validateDownload,
} from "./schema";

const pairSchema = z
  .object({ current: z.string().nullable(), previous: z.string().nullable() })
  .strict();
type Pair = z.infer<typeof pairSchema>;
const bundled = triviaPackSchema.parse(bundledTrivia);
const key = (kind: PackKind) => `rvlry.content.${kind}`;

async function readPair(kind: PackKind): Promise<Pair> {
  if (Capacitor.isNativePlatform())
    return pairSchema.parse(await deviceBridge.readContent({ kind }));
  const raw = localStorage.getItem(key(kind));
  return raw === null ? { current: null, previous: null } : pairSchema.parse(JSON.parse(raw));
}

function selectPack(pair: Pair, fallback: ContentPack) {
  for (const [source, raw] of [
    ["current", pair.current],
    ["previous", pair.previous],
  ] as const) {
    if (raw === null) continue;
    try {
      const pack = parsePack(raw, fallback.kind);
      if (pack.version >= fallback.version) return { pack, raw, source };
    } catch {
      /* Preserve rejected bytes; try the last valid pack, then bundled content. */
    }
  }
  return { pack: fallback, raw: null, source: "bundled" as const };
}

export async function loadTriviaCatalogue() {
  try {
    const pair = await readPair("trivia");
    const selected = selectPack(pair, bundled);
    // Narrow the union at the validated public boundary.
    const pack = triviaPackSchema.parse(selected.pack);
    return {
      pack,
      source: selected.source,
      warning:
        selected.source !== "current" && pair.current !== null
          ? "The installed Trivia pack could not be used. Using fallback content."
          : null,
    };
  } catch {
    return {
      pack: triviaPackSchema.parse(bundledTrivia),
      source: "bundled" as const,
      warning: "Installed Trivia content is unavailable. Using bundled content.",
    };
  }
}

function highestVersion(pair: Pair, fallback: ContentPack): number {
  let highest = fallback.version;
  for (const raw of [pair.current, pair.previous]) {
    if (!raw) continue;
    let header: unknown;
    try {
      header = JSON.parse(raw);
    } catch {
      continue;
    }
    const parsed = z
      .object({
        schemaVersion: z.number(),
        kind: z.literal(fallback.kind),
        version: z.number().int().positive().safe(),
      })
      .safeParse(header);
    if (!parsed.success) continue;
    if (parsed.data.schemaVersion !== 1)
      throw new Error("Installed content needs a compatible app version.");
    highest = Math.max(highest, parsed.data.version);
  }
  return highest;
}

function checkQuestionRevisions(previous: ContentPack, next: ContentPack) {
  if (previous.kind !== "trivia" || next.kind !== "trivia") return;
  const old = new Map(previous.questions.map((question) => [question.id, question]));
  for (const question of next.questions) {
    const before = old.get(question.id);
    if (
      before &&
      (question.revision < before.revision ||
        (question.revision === before.revision &&
          JSON.stringify(question) !== JSON.stringify(before)))
    ) {
      throw new Error(`Question ${question.id} changed without an increased revision.`);
    }
  }
}

let queue: Promise<unknown> = Promise.resolve();

/** Complete replacement only; no saved-game key is read or modified. */
export function installTriviaPack(bytes: Uint8Array, descriptor: PackDescriptor): Promise<void> {
  // Capture caller-owned inputs before awaiting another install.
  const captured = new Uint8Array(bytes);
  const expected = { ...descriptor };
  const operation = queue.then(async () => {
    if (expected.kind !== "trivia") throw new Error("Expected a Trivia pack.");
    const { pack, raw } = await validateDownload(captured, expected);
    const pair = await readPair("trivia"); // A failed read must not enable an overwrite.
    if (pack.version <= highestVersion(pair, bundled))
      throw new Error("Only a newer content pack can be installed.");
    const previous = selectPack(pair, bundled);
    checkQuestionRevisions(previous.pack, pack);
    const options = {
      kind: "trivia" as const,
      value: raw,
      expectedCurrent: pair.current,
      retainedPrevious: previous.raw,
    };
    if (Capacitor.isNativePlatform()) await deviceBridge.installContent(options);
    else {
      const latest = await readPair("trivia");
      if (latest.current !== pair.current)
        throw new Error("Content changed during installation. Retry.");
      localStorage.setItem(key("trivia"), JSON.stringify({ current: raw, previous: previous.raw }));
    }
  });
  queue = operation.catch(() => undefined);
  return operation;
}
