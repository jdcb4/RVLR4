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

Before releasing multiplayer/socket-heavy changes, also walk [`docs/MULTIPLAYER_QA.md`](MULTIPLAYER_QA.md) with two browsers (see `README.md`).

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

| Change area                                                     | Command / follow-up                                            |
| --------------------------------------------------------------- | -------------------------------------------------------------- |
| Docker image (`Dockerfile`, server static assets, runtime port) | `pnpm run docker:build`                                        |
| Socket.IO / room sync / multiplayer UX                          | Manual matrix in [`docs/MULTIPLAYER_QA.md`](MULTIPLAYER_QA.md) |

## Environment

Use Node.js 22 LTS (see `.nvmrc`) and pnpm 9+.
