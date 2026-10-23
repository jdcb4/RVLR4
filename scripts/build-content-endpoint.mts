import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CONTENT_MANIFEST_URL } from "../src/services/contentPacks/download";
import { assemblePublications, publicationAsset } from "../src/services/contentPacks/publication";
import {
  contentManifestSchema,
  parsePack,
  type ContentPack,
} from "../src/services/contentPacks/schema";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "out/content-endpoint");
const ledger = path.join(root, "content/updates");
const batches: ContentPack[] = [];
for (const filename of (await readdir(ledger)).filter((name) => name.endsWith(".json")).sort()) {
  const match = /^(words|trivia)-v([1-9]\d*)\.json$/u.exec(filename);
  if (!match) throw new Error(`Unexpected ledger filename ${filename}.`);
  const pack = parsePack(
    await readFile(path.join(ledger, filename), "utf8"),
    match[1] as "words" | "trivia",
  );
  if (pack.version !== Number(match[2])) throw new Error(`Version mismatch in ${filename}.`);
  batches.push(pack);
}
const baselines = await Promise.all(
  (["words", "trivia"] as const).map(async (kind) =>
    parsePack(await readFile(path.join(ledger, "baseline", `${kind}.json`), "utf8"), kind),
  ),
);
const packs = assemblePublications(baselines, batches);
const assets = await Promise.all(
  packs.map((pack) => publicationAsset(pack, new URL("./", CONTENT_MANIFEST_URL).href)),
);
const manifest = contentManifestSchema.parse({
  schemaVersion: 1,
  packs: assets.map((asset) => asset.descriptor),
});
const directory = path.join(output, "rvlry/v1");
await mkdir(directory, { recursive: true });
for (const asset of assets) {
  const target = path.join(directory, asset.filename);
  try {
    await writeFile(target, asset.bytes, { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    if (!Buffer.from(asset.bytes).equals(await readFile(target)))
      throw new Error(`Immutable asset changed: ${target}`);
  }
}
// Manifest is written last, after every validated asset exists. Deployment is one atomic asset version.
await writeFile(path.join(directory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  path.join(output, "_headers"),
  `/*
  Access-Control-Allow-Origin: *
  X-Content-Type-Options: nosniff
  X-Robots-Tag: noindex, nofollow
  Referrer-Policy: no-referrer
  Cache-Control: public, max-age=0, must-revalidate
`,
);
await writeFile(
  path.join(output, "index.html"),
  "<!doctype html><title>RVLRY content</title><p>RVLRY public word and Trivia updates.</p>\n",
);
console.log(
  JSON.stringify(
    {
      endpoint: CONTENT_MANIFEST_URL,
      output,
      packs: packs.map((pack) => ({
        kind: pack.kind,
        version: pack.version,
        count: pack.kind === "words" ? pack.entries.length : pack.questions.length,
        explicitRemovals: pack.removedIds.length,
      })),
    },
    null,
    2,
  ),
);
