import { Capacitor } from "@capacitor/core";
import { z } from "zod";

import bundledTrivia from "../../data/trivia/bundled.json";
import { triviaPackSchema } from "../../data/triviaSchema";
import { deviceBridge } from "../nativeSnapshotStore";
import { bundledWordsPack, mergeContentPacks, reconcileBundledPack } from "./merge";
import {
  type ContentPack,
  type PackDescriptor,
  type PackKind,
  parsePack,
  validateDownload,
  wordsPackSchema,
} from "./schema";

const pairSchema = z
  .object({ current: z.string().nullable(), previous: z.string().nullable() })
  .strict();
type Pair = z.infer<typeof pairSchema>;
const bundledTriviaPack = triviaPackSchema.parse(bundledTrivia);
const bundledPack = (kind: PackKind): ContentPack =>
  kind === "trivia" ? bundledTriviaPack : bundledWordsPack;
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
      return { pack: reconcileBundledPack(fallback, pack), raw, source };
    } catch {
      /* Preserve rejected bytes; try the last valid pack, then bundled content. */
    }
  }
  return { pack: fallback, raw: null, source: "bundled" as const };
}

async function loadCatalogue(kind: PackKind) {
  const bundled = bundledPack(kind);
  const label = kind === "trivia" ? "Trivia" : "word";
  try {
    const pair = await readPair(kind);
    const selected = selectPack(pair, bundled);
    return {
      pack: selected.pack,
      source: selected.source,
      warning:
        selected.source !== "current" && pair.current !== null
          ? `The installed ${label} pack could not be used. Using fallback content.`
          : null,
    };
  } catch {
    return {
      pack: parsePack(JSON.stringify(bundled), kind),
      source: "bundled" as const,
      warning: `Installed ${label} content is unavailable. Using bundled content.`,
    };
  }
}

export async function loadTriviaCatalogue() {
  const result = await loadCatalogue("trivia");
  return { ...result, pack: triviaPackSchema.parse(result.pack) };
}

export async function loadWordsCatalogue() {
  const result = await loadCatalogue("words");
  return { ...result, pack: wordsPackSchema.parse(result.pack) };
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

let queue: Promise<unknown> = Promise.resolve();

/** Atomically checkpoint the merged catalogue; game snapshots remain independent. */
export function installContentPack(bytes: Uint8Array, descriptor: PackDescriptor): Promise<void> {
  // Capture caller-owned inputs before awaiting another install.
  const captured = new Uint8Array(bytes);
  const expected = { ...descriptor };
  const operation = queue.then(async () => {
    const { pack } = await validateDownload(captured, expected);
    const bundled = bundledPack(pack.kind);
    const pair = await readPair(pack.kind); // A failed read must not enable an overwrite.
    if (pack.version <= highestVersion(pair, bundled))
      throw new Error("Only a newer content pack can be installed.");
    const previous = selectPack(pair, bundled);
    const merged = mergeContentPacks(previous.pack, pack);
    // Merging can exceed the limit even when the downloaded batch itself fits.
    const raw = JSON.stringify(merged);
    parsePack(raw, pack.kind);
    const options = {
      kind: pack.kind,
      value: raw,
      expectedCurrent: pair.current,
      retainedPrevious: previous.raw,
    };
    if (Capacitor.isNativePlatform()) await deviceBridge.installContent(options);
    else {
      const latest = await readPair(pack.kind);
      if (latest.current !== pair.current)
        throw new Error("Content changed during installation. Retry.");
      localStorage.setItem(
        key(pack.kind),
        JSON.stringify({ current: raw, previous: previous.raw }),
      );
    }
  });
  queue = operation.catch(() => undefined);
  return operation;
}

export function installTriviaPack(bytes: Uint8Array, descriptor: PackDescriptor): Promise<void> {
  if (descriptor.kind !== "trivia") return Promise.reject(new Error("Expected a Trivia pack."));
  return installContentPack(bytes, descriptor);
}
