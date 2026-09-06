# RVLRY

> Vite + React UI with **Express + Socket.IO** multiplayer rooms. Legacy pass-and-play routes still exist under `/legacy` and `/games/*`.

## Games

- **Who What Where** — team word-description turns.
- **Hat Game** — three-phase celebrity-style clues.
- **Imposter** — hidden-role word reveal and guided social deduction.
- **DrawNGuess** — simultaneous drawing/guessing books with presentation and final gallery.

## Prerequisites

- Node.js 22 LTS (see `.nvmrc`)
- pnpm 9+
- Docker Desktop (only if you build images locally)

## Quick start

```bash
pnpm install
pnpm run dev
```

`pnpm run dev` launches **Vite** on port **5173** and the **Express/Socket.IO** server on **3001**, with `/api` + `/socket.io` proxied through Vite.

## Common scripts

| Script                  | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `pnpm run dev`          | Full multiplayer dev stack (Vite + Node).            |
| `pnpm run start`        | Production Node server (run `pnpm run build` first). |
| `pnpm run preview`      | Built client and multiplayer with local origins.     |
| `pnpm run typecheck`    | TypeScript checking.                                 |
| `pnpm run lint`         | ESLint.                                              |
| `pnpm test`             | Vitest once.                                         |
| `pnpm run test:watch`   | Vitest in watch mode.                                |
| `pnpm run build`        | Production client bundle (`dist/`).                  |
| `pnpm run verify`       | Run typecheck, lint, test, and build (commit gate).  |
| `pnpm run docker:build` | Manually build the optional portability image.       |

The primary deployment path is GitHub-to-Railway using Railpack. Docker is an
optional manual portability/self-hosting path and is not built during routine
verification. See `docs/PROJECT_INDEX.md` for the full command list and
`docs/DEPLOYMENT.md` for deploy instructions.

## Documentation

All durable docs live under `/docs`. Start with `docs/PROJECT_INDEX.md`.

**Multiplayer regression:** before releases or large server/client sync changes, walk through [`docs/MULTIPLAYER_QA.md`](docs/MULTIPLAYER_QA.md) (two browsers). Optional server diagnostics: start Node with `MULTIPLAYER_DEBUG=1` to log `[multiplayer]` room lifecycle lines (never includes secrets).

## License

Copyright (c) 2026.
