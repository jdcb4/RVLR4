import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PRIVACY_DATE, PRIVACY_SECTIONS, SUPPORT_EMAIL } from "../src/config/privacy";

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
const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const page = (title: string, body: string) =>
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — RVLRY</title><style>body{font:17px/1.6 system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 24px;color:#20252a;background:#faf8f3}a{color:#195b79}h1,h2{line-height:1.2}h2{font-size:1.2rem;margin-top:2rem}</style><main><h1>${title}</h1>${body}<p><a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p></main></html>`;
await writeFile(
  path.join(output, "rvlry/privacy.html"),
  page(
    "Privacy policy",
    `<p>RVLRY · Effective ${PRIVACY_DATE}</p>${PRIVACY_SECTIONS.map((section) => `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.text)}</p></section>`).join("")}<p><a href="https://www.cloudflare.com/privacypolicy/">Cloudflare privacy policy</a> · <a href="https://policies.google.com/privacy">Google privacy policy</a></p>`,
  ),
);
await writeFile(
  path.join(output, "rvlry/support.html"),
  page(
    "RVLRY support",
    '<p>RVLRY is a free offline collection of party games and shared Trivia for adults. It has no ads or in-app purchases.</p><p>For help, describe the issue and include the app version shown under App information. Please avoid sending private game details unless needed to explain the problem.</p><p><a href="privacy.html">Privacy policy</a></p>',
  ),
);
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
