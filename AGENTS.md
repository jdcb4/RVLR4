# Agent Instructions — JD Multiplayer Games

This project began as a pass-and-play hub; it is now a **Vite + Express + Socket.IO** multiplayer app. Legacy pass-and-play routes still live under `/legacy` and `/games/*` for the solo flow.

This file holds the rules an agent must obey **on every turn**. Detailed reference material (deterministic tools, deep modularity rules, dependency policy) lives in `docs/AGENT_REFERENCE.md` — load it on demand, not by default.

## Project shape

- Preset: `client + server` (Vite React SPA + Express + Socket.IO)
- Deploy targets: **Docker (recommended self-host)**, **Railway/Node platforms**, and optional static GitHub Pages (legacy)
- Stack defaults: TypeScript strict, pnpm, Vite, ESLint + Prettier, Vitest + RTL, Zod, Tailwind + shadcn-style components.
- **Multiplayer state is in-memory on the Node process** (no database). A future database would need a `docs/DECISIONS.md` entry.
- Auth: **do not implement auth** unless the user explicitly asks for it.

## First-step orientation

Before making changes:

1. Read this file.
2. Read `docs/PROJECT_INDEX.md`.
3. Read any docs relevant to the files being changed.
4. Inspect `package.json` scripts before inventing commands.
5. Prefer existing patterns over new abstractions.

If docs are missing, stale, or inconsistent with the code, fix them as part of the change.

## Hard rules

1. **No auth without explicit request.** If a task seems to need auth, surface that as a question rather than building it.
2. **No new database** for multiplayer sessions — all runtime game state lives in the Node process RAM until restart.
3. **No new top-level dependency or framework** without a `docs/DECISIONS.md` entry recording why.
4. **Run deterministic checks before claiming a task is complete.** See `docs/VERIFICATION.md`. Never claim a check passed when it did not.
5. **Bump the version on every behaviour-affecting change** per `docs/VERSIONING.md`, and update `docs/CHANGELOG.md`. **Whenever `package.json`'s version increases, create a git commit** in the same change that includes the bump, changelog entry, and the code/docs that justify it. If the change is version-neutral, say so explicitly in the commit message.
6. **Do not implement roadmap items unless the user moves them into active work.** Out-of-scope ideas go into `docs/ROADMAP.md`.
7. **Do not commit secrets, build output, `node_modules`, or local env files.** See `.gitignore` and `SECURITY.md`.
8. **Do not weaken or skip tests to make them pass.** Fix the underlying issue.
9. **Local dev is Windows PowerShell.** When running shell commands locally use PowerShell syntax (no `&&`/`||` chains, env vars are `$env:NAME`, line continuation is backtick). CI and Docker run on Linux bash — that's fine, just don't conflate the two. Cheatsheet in `docs/AGENT_REFERENCE.md`.

## Deterministic checks before commit

```bash
pnpm run typecheck
pnpm test
pnpm run lint
pnpm run build
```

For Socket.IO, room sync, or `server/` changes, also walk [`docs/MULTIPLAYER_QA.md`](docs/MULTIPLAYER_QA.md) with two browsers (or note why skipped).

For significant implementation changes, also run Fallow and consider its feedback:

```bash
pnpm dlx fallow --no-cache --format human
```

`docs/VERIFICATION.md` lists preset-specific extra checks (Docker build, deploy preview, etc.).

## Documentation map

- `docs/PROJECT_INDEX.md` — entry point: folders, commands, key docs.
- `docs/ARCHITECTURE.md` — module boundaries and runtime shape.
- `docs/VERIFICATION.md` — required deterministic checks.
- `docs/VERSIONING.md` — version rules.
- `docs/DECISIONS.md` — durable decisions (ADR-lite).
- `docs/ROADMAP.md` — future ideas only.
- `docs/MULTIPLAYER_QA.md` — manual multiplayer regression matrix (two browsers) before shipping sync-heavy changes.
- `docs/CHANGELOG.md` — notable changes by version.
- `docs/DEPLOYMENT.md` — deploy instructions.
- `docs/AGENT_REFERENCE.md` — detailed agent reference (load when relevant).
- `docs/AGENT_PROMPTS.md` — canonical re-usable task prompts.

## When blocked

If a task cannot be completed cleanly:

1. Make the smallest safe improvement available.
2. Document what remains blocked and why.
3. Include exact commands run and exact failures.
4. Do not claim checks passed unless they were run successfully.
