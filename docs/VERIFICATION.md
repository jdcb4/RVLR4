# Verification

Run these deterministic checks before commit:

```bash
pnpm run typecheck
pnpm test
pnpm run lint
pnpm run build
```

The combined gate is also exposed as:

```bash
pnpm run verify
```

For significant implementation changes, run Fallow and consider its feedback before final verification:

```bash
pnpm dlx fallow --no-cache --format human
```

The default combined run includes **health** (cyclomatic / CRAP heuristics). Large React hooks and game reducers often trigger those thresholds without indicating a bug. To check only **unused dependencies, dead exports, and duplication** (the issues most actionable in small fixes), use:

```bash
pnpm run fallow:hygiene
```

If Fallow is unavailable, record that it was skipped and perform a local code-quality review before running the deterministic checks. Fallow 2.x reads `.fallowrc.json`: use **`entry`** (glob list of entry points, including tests/scripts) and **`ignorePatterns`** — the old `entrypoints` / `ignore` keys are no longer accepted.

## Optional deeper checks

When investigating dead code, duplication, or unused dependencies:

```bash
pnpm dlx ts-prune
pnpm dlx knip
pnpm dlx jscpd .
```

These may report false positives for framework entrypoints, plugin-loaded files, or runtime-only deps. Document false positives near the relevant config or in this file.

## Preset-specific checks

> Add preset-specific verification commands here as the project introduces them. Examples:
>
> - `pnpm run docker:build` — required for changes affecting the Docker image.
> - `pnpm run build:pages` — required for changes affecting GitHub Pages.
> - `pnpm run wrangler:deploy --dry-run` — required for Cloudflare Workers config changes.
> - `pnpm run db:migrate` followed by re-running the test suite — required for schema changes.

## Environment

Use Node.js 22 LTS (see `.nvmrc`) and pnpm 9+.
