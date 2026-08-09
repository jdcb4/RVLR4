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

Security-sensitive or significant server work also runs production dependency
audit, import smoke testing, and coverage:

```bash
pnpm audit --prod
pnpm run smoke:server-imports
pnpm run test:coverage
```

Coverage uses Vitest's Istanbul adapter and emits text, HTML, and
`coverage/coverage-final.json` in the format Fallow consumes. Projection and
sync modules require 95% lines/statements, 100% functions, and 90% branches;
boundary schemas, reconnect-secret comparison, and the limiter require 100%
lines/statements/functions and 90% branches. Fake-clock tests cover all server
turn tickers, room cleanup, limiter cleanup, and shutdown health state.

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

Fallow may classify `tailwindcss` as an unused production dependency because
it executes during Vite/PostCSS builds rather than from application imports.
It remains a required `devDependency`; this is the reviewed build-tool false
positive, not a reason to remove or move it.

Run `pnpm dlx fallow security --no-cache --format human` for security-candidate
review. Its current same-origin `fetch` candidates use encoded room-code path
segments, `Retry-After` is derived as an integer, and the reported static-file
paths are composed only from build-time literals. These are reviewed false
positives; re-review them if their input sources or path construction changes.

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
| Explicit Docker work (`docker/Dockerfile`, image runtime or packaging) | `pnpm run docker:build`                                 |
| Socket.IO / room sync / multiplayer UX                          | Manual matrix in [`docs/MULTIPLAYER_QA.md`](MULTIPLAYER_QA.md) |

Routine Railway deployments use the GitHub source integration and Railpack.
Do not build or publish a Docker image for ordinary commits, Railway config
changes, or release verification unless Docker itself is in scope.

## Environment

Use Node.js 22 LTS (see `.nvmrc`) and pnpm 9+.
