# Project Index — RVLRY

The first stop for navigating this project.

## What this project is

Mobile-first **party game hub** with two first-class play modes:

- **Multi-Device mode** (default) — join codes + Socket.IO; landing at `/`.
- **Pass-and-Play mode** — single-device flows at `/passnplay` (alias `/legacy` redirects for back-compat) → `/games/*`.

Games:

- **Who What Where** — networked timed turns + shared lobby (`/` → `/room/:code`).
- **Hat Game** — full networked match flow from lobby through results (`HatMultiplayerView`).
- **Imposter** — full networked match flow from lobby through results (`ImposterMultiplayerView`).
- **DrawNGuess** — production multiplayer flow from lobby through drawing, guessing, presentation, and final gallery (`DrawNGuessMultiplayerView`).

## Branch and release flow

- `dev` is the GitHub default and integration branch. Routine work starts
  there, and Railway's `dev` environment deploys it.
- `main` is the reviewed production branch. Promote `dev` to `main` only after
  Joe reviews and approves the candidate; Railway production deploys `main`.
- The full operating contract is in [`AGENTS.md`](../AGENTS.md), with deployment
  details in [`docs/DEPLOYMENT.md`](DEPLOYMENT.md).

## Important folders

- `server/` — Express routes + Socket.IO handlers + in-memory room store.
- `src/app` — router, root layout, smoke tests.
- `src/features/multiplayer` — Multi-Device mode **shell**: join/host UX (`MultiplayerHomePage`, `EnterNamePage`, `RoomPage`, `MultiplayerGameShell`, `lobbyCaptain`). Per-game multiplayer views live next to their pass-and-play counterparts (see below).
- `src/features/passnplay` — Pass-and-Play hub (`PassNPlayHubPage`) at `/passnplay` (alias `/legacy` redirects here).
- `src/features/whowhatwhere` — Who What Where: pass-and-play UI + `useWhoWhatWhereSingleplayerApp` (`WhoWhatWhereLandingScreen`, `WhoWhatWhereReviewTeamsScreen`, …); networked shell at `multiplayer/WhoWhatWhereMultiplayerView.tsx`.
- `src/features/hat-game` — Hat Game: pass-and-play web UI + `useHatSingleplayerApp`; per-screen builders under `screens/` wired by `buildHatSingleplayerScreen` in `HatSingleplayerWebScreens.tsx`; networked shell at `multiplayer/HatMultiplayerView.tsx`.
- `src/features/imposter` — Imposter: pass-and-play UI + `useImposterSingleplayerApp`; `ImposterSingleplayerWebScreens.tsx` routes steps; screen modules under `screens/`; networked shell at `multiplayer/ImposterMultiplayerView.tsx`.
- `src/features/drawnguess` — DrawNGuess production multiplayer UI, controlled whiteboard, drawing preview, local presentation books, and final gallery.
- `src/domain/whowhatwhere` — WhoWhatWhere rules (framework-free).
- `src/domain/hat-game` — Hat Game engine + setup helpers.
- `src/domain/imposter` — Imposter dealing and setup validation (social outcomes only in real life).
- `src/domain/drawnguess` — DrawNGuess packet rotation, prompt selection, submissions, timer auto-submit, and reveal rules.
- `src/domain/shared` — cross-game types (e.g. roster row shape for setup UI).
- `src/components` — shared UI (`GameShell`, `GamePanel`, `GameResultActions`, `AppInfoOverlay`, `game/` panels including **`final-results/`** (shared podium + confetti), `GameScoreboard`, **`BetweenTurnsLayout`** / **`LandingScreenLayout`** (cross-game ready/recap + landing shells), ready-flow and **Final turn recap** pieces (`ThatsTheLastTurnCard`, `finalTurnRecapCopy`), footer buttons, `EditableName`, `Metric`, `setup/`, `team-setup/`, `ui/button`).
- `src/services` — browser persistence (`whowhatwherePersistence`, `hatStorage`, `imposterStorage`) and Web Audio (`whowhatwhereSound`, `hatSound`).
- `src/data` — JSON-only curated game content: Who What Where words/name packs,
  Hat suggestions/name packs, DrawNGuess prompts, Imposter words, and
  multiplayer display names. Domain loaders validate every asset with Zod.
- `src/assets` — static assets bundled by Vite (e.g. Hat Game phase `.wav` cues).
- `src/config` — `env.ts`, `hatDefaults.ts`, `imposterDefaults.ts`, `teamRoster.ts` (shared 2–4 teams, 2–6 players per team), `appMeta.ts` (product label for shared chrome).
- `src/typography` — named font tier map (`tiers.ts`) for `text-typ-*` utilities.
- `src/themes` — semantic color tokens (`default.css`) layered on primitives in `index.css`.
- `public` — static browser/app assets copied by Vite, including favicon and web app icon files.
- `docs` — durable project documentation.
- `scripts` — deterministic project utility scripts.
- `gallery.html` / `src/ui-gallery/` — dev-only UI gallery (not part of default `pnpm run build`).

## Commands

| Command                   | Purpose                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `pnpm run dev`            | Starts **Vite** (`5173`) + **Express/Socket.IO** (`3001`) via `concurrently`.         |
| `pnpm run dev:client`     | Vite only.                                                                            |
| `pnpm run dev:server`     | Node multiplayer server only (`tsx watch`).                                           |
| `pnpm run start`          | Production-style Node server (expects `dist/` built).                                 |
| `pnpm run ui-gallery`     | Dev-only paired-screen preview (`gallery.html`, port 5174). See `docs/UI_GALLERY.md`. |
| `pnpm run typecheck`      | TypeScript checking.                                                                  |
| `pnpm run lint`           | ESLint.                                                                               |
| `pnpm test`               | Vitest once.                                                                          |
| `pnpm run test:watch`     | Vitest in watch mode.                                                                 |
| `pnpm run build`          | Production build used by local checks and Railway Railpack.                           |
| `pnpm run verify`         | Typecheck + lint + test + build (commit gate).                                        |
| `pnpm run fallow:hygiene` | Fallow dead-code + duplication only (see `docs/VERIFICATION.md`).                     |
| `pnpm dlx fallow ...`     | Full Fallow scan (dead-code, duplication, health metrics).                            |
| `pnpm run docker:build`   | Manual portability/self-hosting image; only run for explicit Docker work.             |

## Key docs

### Operating and engineering

- [`README.md`](../README.md) — human-facing overview and quick start.
- [`AGENTS.md`](../AGENTS.md) — the every-turn agent ruleset.
- [`CLAUDE.md`](../CLAUDE.md) — compatibility pointer to `AGENTS.md`; it must
  not duplicate project guidance.
- [`docs/AGENT_REFERENCE.md`](AGENT_REFERENCE.md) — detailed agent reference.
- [`docs/AGENT_PROMPTS.md`](AGENT_PROMPTS.md) — canonical re-usable task prompts.
- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — module boundaries and runtime shape.
- [`docs/VERIFICATION.md`](VERIFICATION.md) — required checks before commit.
- [`docs/VERSIONING.md`](VERSIONING.md) — release and version-bump rules.
- [`docs/NAMING.md`](NAMING.md) — canonical symbol, file, and action vocabulary.
- [`docs/SECURITY_MAINTAINABILITY_PLAN.md`](SECURITY_MAINTAINABILITY_PLAN.md) —
  active, ranked remediation plan from the RM-06 audit; delete after close-out.
- [`SECURITY.md`](../SECURITY.md) — security rules and reporting.

### Product and runtime

- [`docs/SCREENS.md`](SCREENS.md) — current screen and flow names.
- [`docs/DRAWNGUESS.md`](DRAWNGUESS.md) — DrawNGuess runtime, data, socket, and QA reference.
- [`docs/MULTIPLAYER_QA.md`](MULTIPLAYER_QA.md) — two-browser multiplayer regression matrix.
- [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) — Railway-first deployment instructions.

### UI system and tooling

- [`docs/TYPOGRAPHY.md`](TYPOGRAPHY.md) — named font tiers (`text-typ-*`).
- [`docs/THEMING.md`](THEMING.md) — semantic colors (`semantic-*`) and theme layers.
- [`docs/UI_GALLERY.md`](UI_GALLERY.md) — development-only paired-screen gallery.

### Decisions, history, and future work

- [`docs/DECISIONS.md`](DECISIONS.md) — durable decisions (ADR-lite).
- [`docs/ROADMAP.md`](ROADMAP.md) — future ideas only, not active work.
- [`docs/CHANGELOG.md`](CHANGELOG.md) — notable changes by version.

This index lists the maintained documentation set. Completed one-shot audits
and implementation plans are not retained alongside canonical guidance: their
lasting decisions belong in the relevant docs above, while shipped history is
preserved in the changelog and git.
