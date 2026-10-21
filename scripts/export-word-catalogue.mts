/**
 * Maintained catalogue review export. Run `pnpm export:words` from the checkout.
 * Reads the bundled catalogue, validates it, and writes a UTF-8 CSV to out/.
 * No network, credentials or changes to source content.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { getWordCatalogue } from "../src/data/wordCatalogue.ts";

const root = new URL("../", import.meta.url);
const entries = getWordCatalogue();
const headers = [
  "Answer",
  "Category",
  "Difficulty",
  "Kids ages 8–12",
  "Deliberately kids-targeted",
  "Games",
  "Origin",
  "Original source IDs",
  "Aliases",
  "Hint",
];
const rows = entries.map((entry) => [
  entry.word,
  entry.category,
  entry.difficulty,
  entry.kidAppropriate ? "Yes" : "No",
  entry.kidTargeted ? "Yes" : "No",
  entry.games.join("; "),
  entry.originalIds.length ? "Original" : "Added October 2026",
  entry.originalIds.join("; "),
  entry.aliases.join("; "),
  entry.hint,
]);
mkdirSync(new URL("out/", root), { recursive: true });
for (const [filename, selectedRows] of [
  ["RVLRY-word-catalogue.csv", rows],
  ["RVLRY-kids-targeted.csv", rows.filter((_, index) => entries[index]?.kidTargeted)],
] as const) {
  const csv = [headers, ...selectedRows]
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\r\n");
  const output = new URL(`out/${filename}`, root);
  writeFileSync(output, `\uFEFF${csv}\r\n`);
  console.log(`Exported ${selectedRows.length} unique answers to ${fileURLToPath(output)}`);
}
for (const game of ["www", "hat", "imposter"] as const) {
  const pool = entries.filter((entry) => entry.games.includes(game));
  console.log(
    `${game}: ${pool.length} answers, ${pool.filter((entry) => entry.kidAppropriate).length} kids-appropriate`,
  );
}
