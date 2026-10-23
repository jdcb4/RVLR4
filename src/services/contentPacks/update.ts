import { setActiveWordCatalogue } from "../../data/wordCatalogue";
import { checkContentUpdates, downloadContentPack } from "./download";
import type { PackKind } from "./schema";
import { installContentPack, loadTriviaCatalogue, loadWordsCatalogue } from "./store";

export type ContentUpdateResult = { updated: PackKind[]; failures: PackKind[] };
let running: Promise<ContentUpdateResult> | null = null;

/** Manual, single-flight update. Each catalogue commits independently and atomically. */
export function updateContent(): Promise<ContentUpdateResult> {
  if (running) return running;
  running = performUpdate().finally(() => {
    running = null;
  });
  return running;
}

async function performUpdate(): Promise<ContentUpdateResult> {
  const { manifest } = await checkContentUpdates();
  const result: ContentUpdateResult = { updated: [], failures: [] };
  for (const descriptor of manifest.packs) {
    try {
      const current =
        descriptor.kind === "words" ? await loadWordsCatalogue() : await loadTriviaCatalogue();
      if (descriptor.version <= current.pack.version) {
        if (current.warning) throw new Error("Installed content could not be loaded.");
        // Also recover from a prior successful commit whose activation read failed.
        if (current.pack.kind === "words") setActiveWordCatalogue(current.pack.entries);
        continue;
      }
      const bytes = await downloadContentPack(descriptor);
      await installContentPack(bytes, descriptor);
      if (descriptor.kind === "words") {
        const installed = await loadWordsCatalogue();
        if (installed.warning) throw new Error("Could not activate installed words.");
        setActiveWordCatalogue(installed.pack.entries);
      }
      result.updated.push(descriptor.kind);
    } catch {
      result.failures.push(descriptor.kind);
    }
  }
  return result;
}
