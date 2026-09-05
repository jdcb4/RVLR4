# Architecture — RVLRY

## Runtime shape

**Vite React SPA** (`src/`) paired with a **Node HTTP server** (`server/index.ts`) that serves **`dist/`**, exposes REST endpoints under **`/api/*`**, and coordinates realtime gameplay via **Socket.IO**.

React Router drives:

- `/` — multiplayer launcher (**Join** + **Host**).
- `/name` — display name entry + REST host/join handshake.
- `/room/:code` — lobby + networked gameplay shell for the selected title.
- `/passnplay` — Pass-and-Play mode picker pointing at `/games/*` (alias: `/legacy` redirects here for older shared links).
- `/games/whowhatwhere`, `/games/hat`, `/games/imposter` — legacy single-device flows.

Networked game views currently cover Who What Where, Hat Game, Imposter, and DrawNGuess.

Runtime multiplayer state lives **only in the Node process RAM** (rooms keyed by short codes). Clients reconnect with per-player secrets stored in **`sessionStorage`** (`jd-multiplayer:*`).

A room screen owns one socket and closes it on unmount or room changes.
The single-process Socket.IO adapter supplies presence: a player is away only
after their final bound tab disconnects. Rebinding first releases the previous
room membership; viewer broadcasts also check membership before projection.

Browser requests use `src/services/networkRequests.ts`: an eight-second limit
covers HTTP headers and body reading, and Socket.IO clears outstanding acks on
timeout/disconnect. Actions are never automatically replayed. Room screens
surface failures and offer connection retry or home navigation. Entry requests
are cancelled on unmount and duplicate form submissions are prevented.

Lobby synchronization includes a server-authored start-readiness result. The
same pure evaluator gates `lobby:startGame` and supplies host-facing blocker
copy, so client guidance cannot diverge from server enforcement.

Legacy solo flows still persist in **`localStorage`** where applicable. Web Audio cues remain client-side.

The primary deployment path is **GitHub repository -> Railway**, with
`railway.json` explicitly selecting Railpack even though the repository retains
a Dockerfile. Docker (`pnpm run docker:build`) is a manual portability and
self-hosting option only; it is not part of routine deployment or verification.
See `docs/DEPLOYMENT.md`.

## Module boundaries

Use clear layers. Adapt the names if the project demands it, but keep the separation.

### Game screen layout (`GamePanel`)

Use `@/components/game/GamePanel` as the **default wrapper for primary in-game content** on each screen inside `GameShell`: titled card (`bg-card`, border, rounded corners) with optional eyebrow and subtitle. Who What Where, Hat Game, and Imposter follow this.

Shared roster UI (`TeamRosterSetupScreen`) can hide its built-in heading (`omitHeading`) when the parent supplies headings via `GamePanel`. **Primary navigation on roster steps** (Next team / Start round / Review teams) lives in the **`GameShell` footer**, not inside `TeamRosterSetupScreen`.

### Shared screen composition

Share stable presentation structure, not game state machines. Cross-game
layouts such as `LandingScreenLayout`, `BetweenTurnsLayout`, shared review
panels, and final-results components own consistent order, spacing, and chrome.
Game-specific settings, active-turn content, last-turn details, and Hat's
private clue-entry flow stay in their feature modules and compose those shared
pieces. Do not replace them with a conditional cross-game mega-builder; extract
a new shared shell only after at least two durable call sites demonstrate the
same structure.

### Typography tiers (`text-typ-*`)

Use **named font tiers** (`text-typ-ui`, `text-typ-panel-title`, …) backed by CSS variables — see [`docs/TYPOGRAPHY.md`](TYPOGRAPHY.md). Prefer these over raw `text-sm` / `text-xl` / `tracking-*` in components.

### Semantic colors (`semantic-*`)

Use **semantic theme tokens** for tinted surfaces, soft borders, scrims, and dev-gallery chrome — see [`docs/THEMING.md`](THEMING.md). Prefer `bg-semantic-*` / `border-semantic-*` over primitives with `/opacity` Tailwind modifiers; opacity math lives in theme CSS only.

- `src/app` — routing, app shell, framework entrypoints.
- `src/features` — feature-specific UI and orchestration.
- `src/components/ui` — generic visual primitives.
- `src/components` — small reusable app components shared across features.
- `src/domain` — framework-independent business rules. Free of React, IO, and database imports.
- `src/services` — IO wrappers (storage, HTTP, filesystem).
- `src/data` — local data, JSON files, fixtures.
- `src/config` — typed config + environment parsing (Zod).
- `src/lib` — small generic helpers without domain knowledge.
- `src/tests` — shared test utilities and integration tests.

## Boundary rules

- Domain code does not import React, frameworks, filesystem, or database modules unless explicitly required.
- UI components do not own persistence or network calls.
- IO sits behind service modules so it can be mocked or swapped in tests.
- Feature orchestration is separate from pure domain rules.
- Inject time, randomness, IDs, and external services when deterministic tests need control.

## Persistence

Default: curated static game content lives in JSON files under `src/data/` and
is parsed once through game-owned Zod loaders. Large content, such as the Who
What Where deck, stays behind a dynamic loader so it is not part of the initial
client bundle. Move to a database only when JSON is unsuitable, and document
the migration in `docs/DECISIONS.md`.

When a database is needed:

- Drizzle ORM, with SQLite for development and Postgres for production.
- Schemas in `src/db/schema.ts` (or `apps/server/src/db/schema.ts` in monorepo presets).
- Migrations in `drizzle/`.
- Seed scripts under `scripts/`.

## Validation

Zod is the validation default. Validate every external input: forms, URL params, request bodies, environment variables, JSON file loads, third-party API responses, Socket.io events.

HTTP and Socket.IO boundaries use strict schemas, stable error codes, explicit
payload-size limits, and bounded in-memory token buckets. Viewer projections
are server-authored and must remove other players' private data and game
secrets; client-side hiding is never an authorization boundary.

The Express runtime applies Helmet's reviewed header baseline, exact
production origin allow-listing, and a minimal `/api/health` readiness signal.
Operational logs use allow-listed metadata only and never include room codes,
player identifiers, names, reconnect secrets, clues, drawings, bodies, or
headers.

Socket registration is a small composition layer in `server/socketHandlers.ts`.
Session, lobby, replay, and each multiplayer game's handlers live under
`server/socketHandlers/`; every authenticated mutation still enters through
the common schema, actor lookup, and token-budget guard in `socketHandle.ts`.

Single-player orchestration remains game-specific. Pure setup, handoff,
resume, and replay transitions live beside their owning feature, while browser
persistence is isolated from the React controller. Do not combine the three
games into a generic reducer or hook.

## Configuration

Environment variables flow through Zod: **`src/config/env.ts`** (Vite client) and **`server/env.ts`** (Node server). Missing or malformed values must fail fast at startup.

## Testing

- Vitest with `jsdom` for component tests, `node` for domain/server tests.
- React Testing Library for component behaviour.
- Deterministic unit tests for domain logic. Integration tests for important flows.
- Inject fakes for time, randomness, IDs.
- Coverage includes production `server/**/*.ts` and `src/**/*.{ts,tsx}` and
  enforces higher glob-specific gates for projections, sync, validation,
  reconnect-secret comparison, and rate limiting.

## Deployment

See `docs/DEPLOYMENT.md`.
