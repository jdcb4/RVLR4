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

Lobby synchronization includes a server-authored start-readiness result. The
same pure evaluator gates `lobby:startGame` and supplies host-facing blocker
copy, so client guidance cannot diverge from server enforcement.

Legacy solo flows still persist in **`localStorage`** where applicable. Web Audio cues remain client-side.

Deploy targets: **Docker (`pnpm run docker:build`)** and **Railway/Node** (see `docs/DEPLOYMENT.md`).

## Module boundaries

Use clear layers. Adapt the names if the project demands it, but keep the separation.

### Game screen layout (`GamePanel`)

Use `@/components/game/GamePanel` as the **default wrapper for primary in-game content** on each screen inside `GameShell`: titled card (`bg-card`, border, rounded corners) with optional eyebrow and subtitle. Who What Where, Hat Game, and Imposter follow this.

Shared roster UI (`TeamRosterSetupScreen`) can hide its built-in heading (`omitHeading`) when the parent supplies headings via `GamePanel`. **Primary navigation on roster steps** (Next team / Start round / Review teams) lives in the **`GameShell` footer**, not inside `TeamRosterSetupScreen`.

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

## Configuration

Environment variables flow through Zod: **`src/config/env.ts`** (Vite client) and **`server/env.ts`** (Node server). Missing or malformed values must fail fast at startup.

## Testing

- Vitest with `jsdom` for component tests, `node` for domain/server tests.
- React Testing Library for component behaviour.
- Deterministic unit tests for domain logic. Integration tests for important flows.
- Inject fakes for time, randomness, IDs.

## Deployment

See `docs/DEPLOYMENT.md`.
