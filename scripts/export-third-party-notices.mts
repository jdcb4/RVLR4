import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

type Package = { name: string; versions: string[]; paths: string[]; license: string };
const inventory = JSON.parse(
  execFileSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["licenses", "list", "--prod", "--json"],
    {
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  ),
) as Record<string, Package[]>;
const packages = Object.values(inventory)
  .flat()
  .sort((a, b) => a.name.localeCompare(b.name));
const sections = [
  "RVLRY third-party notices\n\nJavaScript production dependencies (including build helpers), bundled fonts and native Android dependency notices. Native inventory includes metadata/platform modules conservatively; not every coordinate contributes shipped bytecode.",
];
for (const entry of packages) {
  // esbuild's platform binary is distributed under the parent package's licence.
  const source = entry.name.startsWith("@esbuild/")
    ? packages.find((candidate) => candidate.name === "esbuild")!
    : entry;
  const directory = source.paths[0]!;
  const files = (await readdir(directory)).filter((name) =>
    /^(licen[cs]e|notice)(\.|$)/i.test(name),
  );
  if (!files.length) throw new Error(`Missing licence text: ${entry.name}`);
  sections.push(
    `${entry.name} ${entry.versions.join(", ")} — ${entry.license}\n\n${(
      await Promise.all(files.sort().map((file) => readFile(join(directory, file), "utf8")))
    ).join("\n\n")}`,
  );
}
for (const file of (await readdir("public/fonts"))
  .filter((name) => name.endsWith("-OFL.txt"))
  .sort()) {
  sections.push(`${file}\n\n${await readFile(join("public/fonts", file), "utf8")}`);
}
const nativePackages = JSON.parse(
  await readFile("docs/release/google-play/native-dependencies.json", "utf8"),
) as { coordinate: string; declaredLicences: string[] }[];
if (
  !nativePackages.length ||
  !nativePackages.some((entry) => entry.coordinate === "org.apache.cordova:framework:14.0.1") ||
  nativePackages.some(
    (entry) =>
      !entry.coordinate ||
      !entry.declaredLicences.length ||
      entry.declaredLicences.some((licence) => !/Apache.*2\.0/i.test(licence)),
  )
) {
  throw new Error("Native dependency inventory changed: review its licence texts before export.");
}
sections.push(
  `Native Android dependencies — Apache License 2.0\n\n${nativePackages
    .map((entry) => entry.coordinate)
    .sort()
    .join("\n")}\n\n${await readFile("notices/native/Apache-2.0.txt", "utf8")}`,
);
sections.push(
  `Apache Cordova 14.0.1 — upstream NOTICE\n\n${await readFile(
    "notices/native/cordova-14.0.1-NOTICE.txt",
    "utf8",
  )}`,
);
await writeFile(
  "public/third-party-notices.txt",
  sections.join("\n\n----------------------------------------\n\n") + "\n",
);
console.log(
  `Exported notices for ${packages.length} JavaScript packages, bundled fonts and ${nativePackages.length} native coordinates.`,
);
