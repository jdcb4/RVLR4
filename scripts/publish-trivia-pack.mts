import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { triviaPackSchema } from "../src/data/triviaSchema";
import { MAX_PACK_BYTES, packDescriptorSchema, sha256 } from "../src/services/contentPacks/schema";

const [input, output, baseUrl] = process.argv.slice(2);
if (!input || !output || !baseUrl) {
  throw new Error(
    "Usage: pnpm publish:trivia <reviewed-pack.json> <output-directory> <https-base-url/>",
  );
}
const source = await readFile(input);
if (source.byteLength > MAX_PACK_BYTES) throw new Error("Source exceeds 8 MiB.");
const pack = triviaPackSchema.parse(
  JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(source)),
);
if (pack.questions.length === 0) throw new Error("Do not publish an empty reviewed catalogue.");
const bytes = new TextEncoder().encode(`${JSON.stringify(pack)}\n`);
if (bytes.byteLength > MAX_PACK_BYTES) throw new Error("Pack exceeds 8 MiB.");
const filename = `trivia-v${pack.version}.json`;
const descriptor = packDescriptorSchema.parse({
  kind: "trivia",
  version: pack.version,
  url: new URL(filename, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).href,
  bytes: bytes.byteLength,
  sha256: await sha256(bytes),
});
await mkdir(output, { recursive: true });
// Never silently replace an already-published version with different bytes.
await writeFile(path.join(output, filename), bytes, { flag: "wx" });
await writeFile(
  path.join(output, `trivia-v${pack.version}.manifest.json`),
  `${JSON.stringify({ schemaVersion: 1, packs: [descriptor] }, null, 2)}\n`,
  { flag: "wx" },
);
console.log(
  `Validated ${pack.questions.length} reviewed records. Wrote ${filename} and its manifest; nothing uploaded.`,
);
