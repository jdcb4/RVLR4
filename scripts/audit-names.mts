/**
 * Deterministic naming-audit dump.
 *
 * Walks every .ts/.tsx file under src/ and server/, emits one JSON line per
 * exported symbol:
 *
 *   { file, name, kind, isComponent, isHook, verb, gameTag, modeTag }
 *
 * `kind` is the AST node kind ("function", "class", "interface", "type",
 * "variable", "enum"). `verb` is the first lowercase word of camelCase names
 * (heuristic — useful for grouping parallel actions like start/end/replay).
 * `gameTag` / `modeTag` flag matches against the canonical game and mode
 * tokens we want to standardize on.
 *
 * Run:
 *   pnpm exec tsx scripts/audit-names.mts > /tmp/audit-names.jsonl
 *
 * This is a one-shot diagnostic — no behavioural impact on the app.
 */
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import ts from "typescript";

const ROOT = process.cwd();
const TARGETS = ["src", "server"];

const GAME_TOKENS = [
  "hat",
  "Hat",
  "HatGame",
  "hatGame",
  "whowhatwhere",
  "WhoWhatWhere",
  "Www",
  "www",
  "imposter",
  "Imposter",
];

const MODE_TOKENS = [
  "Multiplayer",
  "multiplayer",
  "MultiDevice",
  "multiDevice",
  "PassNPlay",
  "passNPlay",
  "Legacy",
  "legacy",
];

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === ".turbo") {
        continue;
      }
      yield* walk(full);
    } else if (/\.(ts|tsx|mts)$/.test(entry) && !/\.(test|spec)\.(ts|tsx)$/.test(entry)) {
      yield full;
    }
  }
}

type Row = {
  readonly file: string;
  readonly name: string;
  readonly kind: string;
  readonly isComponent: boolean;
  readonly isHook: boolean;
  readonly verb: string | null;
  readonly gameTags: readonly string[];
  readonly modeTags: readonly string[];
};

function firstCamelWord(name: string): string | null {
  // "startNewGame" -> "start"; "PassNPlayHubPage" -> null (starts upper).
  const match = name.match(/^[a-z]+/);
  return match ? match[0] : null;
}

function tokenMatches(name: string, tokens: readonly string[]): string[] {
  // Case-insensitive substring match, but emit the canonical token when found.
  // Examples: "useHatGameApp" -> ["hatGame", "hat"]; "WhoWhatWhereLandingScreen" -> ["Www"].
  const hits = new Set<string>();
  for (const token of tokens) {
    if (name.includes(token)) {
      hits.add(token);
    }
  }
  return [...hits];
}

function analyzeNode(
  node: ts.Node,
  file: string,
  rows: Row[],
): void {
  const tryEmit = (name: string, kind: string) => {
    const isComponent = /^[A-Z]/.test(name) && /tsx$/.test(file);
    const isHook = /^use[A-Z]/.test(name);
    rows.push({
      file,
      name,
      kind,
      isComponent,
      isHook,
      verb: firstCamelWord(name),
      gameTags: tokenMatches(name, GAME_TOKENS),
      modeTags: tokenMatches(name, MODE_TOKENS),
    });
  };

  if (ts.isFunctionDeclaration(node) && node.name && hasExportModifier(node)) {
    tryEmit(node.name.text, "function");
  } else if (ts.isClassDeclaration(node) && node.name && hasExportModifier(node)) {
    tryEmit(node.name.text, "class");
  } else if (ts.isInterfaceDeclaration(node) && hasExportModifier(node)) {
    tryEmit(node.name.text, "interface");
  } else if (ts.isTypeAliasDeclaration(node) && hasExportModifier(node)) {
    tryEmit(node.name.text, "type");
  } else if (ts.isEnumDeclaration(node) && hasExportModifier(node)) {
    tryEmit(node.name.text, "enum");
  } else if (ts.isVariableStatement(node) && hasExportModifier(node)) {
    for (const decl of node.declarationList.declarations) {
      if (ts.isIdentifier(decl.name)) {
        tryEmit(decl.name.text, "variable");
      }
    }
  } else if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
    for (const spec of node.exportClause.elements) {
      tryEmit(spec.name.text, "re-export");
    }
  }
}

function hasExportModifier(
  node: ts.Node & { modifiers?: ts.NodeArray<ts.ModifierLike> },
): boolean {
  return (node.modifiers ?? []).some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
  );
}

function main() {
  const rows: Row[] = [];
  for (const target of TARGETS) {
    const dir = join(ROOT, target);
    for (const file of walk(dir)) {
      const source = ts.createSourceFile(
        file,
        ts.sys.readFile(file) ?? "",
        ts.ScriptTarget.ES2022,
        true,
        file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const rel = relative(ROOT, file).split(sep).join("/");
      ts.forEachChild(source, (node) => analyzeNode(node, rel, rows));
    }
  }

  for (const row of rows) {
    process.stdout.write(JSON.stringify(row) + "\n");
  }

  process.stderr.write(`\n[audit-names] ${rows.length} exported symbols across ${TARGETS.join(", ")}\n`);
}

main();
