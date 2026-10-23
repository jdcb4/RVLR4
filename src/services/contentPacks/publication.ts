import { mergeContentPacks } from "./merge";
import { type ContentPack, type PackKind, parsePack, sha256 } from "./schema";

/** Replay the complete reviewed ledger; a one-record batch cannot truncate a catalogue. */
export function assemblePublications(
  baselines: ContentPack[],
  batches: ContentPack[],
): ContentPack[] {
  const current = new Map<PackKind, ContentPack>(baselines.map((pack) => [pack.kind, pack]));
  for (const batch of [...batches].sort((a, b) => a.version - b.version)) {
    const previous = current.get(batch.kind);
    if (!previous || batch.version <= previous.version)
      throw new Error(`Expected a unique newer ${batch.kind} batch version: ${batch.version}.`);
    current.set(batch.kind, mergeContentPacks(previous, batch));
  }
  return [...current.values()].map((pack) => parsePack(JSON.stringify(pack), pack.kind));
}

export async function publicationAsset(pack: ContentPack, baseUrl: string) {
  const bytes = new TextEncoder().encode(`${JSON.stringify(pack)}\n`);
  const hash = await sha256(bytes);
  const filename = `${pack.kind}-v${pack.version}-${hash.slice(0, 16)}.json`;
  return {
    bytes,
    filename,
    descriptor: {
      kind: pack.kind,
      version: pack.version,
      url: new URL(filename, baseUrl).href,
      bytes: bytes.byteLength,
      sha256: hash,
    },
  };
}
