import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
) as { version?: unknown };

if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
  throw new Error("package.json must contain a non-empty version string");
}

const image = "jdcb4/jd-multiplayer-games";
const result = spawnSync(
  "docker",
  [
    "build",
    "-f",
    "docker/Dockerfile",
    "-t",
    `${image}:${packageJson.version}`,
    "-t",
    `${image}:latest`,
    ".",
  ],
  { stdio: "inherit" },
);

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
