# Multiplayer manual QA matrix

Use this checklist before a release or after meaningful changes to `server/`, `src/features/multiplayer/`, or Socket.IO event shapes.

**Setup:** two browsers (or one browser + one private window), `pnpm run dev`. Host uses `/` → Host a game; guest uses Join + room code from host.

Environment variables are documented in `docs/DEPLOYMENT.md`. Optional diagnostics: set **`MULTIPLAYER_DEBUG=1`** when starting the Node server to print `[multiplayer]` lifecycle lines (no secrets).

## Smoke (all games)

| Step | Action | Expected |
| --- | --- | --- |
| S1 | Host creates room | Redirect to `/name`, then `/room/:code`; code visible; QR/copy work |
| S2 | Guest joins same code + name | Both see lobby; player lists match |
| S3 | Guest toggles ready | Host sees ready state; non-host footer shows ready button |
| S4 | Host starts before all ready | Error or blocked (everyone must ready) |
| S5 | All ready → Host starts | Phase becomes playing; correct shell loads |
| S6 | Refresh guest mid-lobby | Reconnect or clear message per `RoomPage` / session secret |

## Who What Where

| Step | Action | Expected |
| --- | --- | --- |
| W1 | Ready + start | WWW playing UI; teams preserved from lobby |
| W2 | Non-describer | Cannot start turn / mark actions meant for describer only |
| W3 | Turn timer | Behaviour matches domain rules; sync updates |

## Hat Game

| Step | Action | Expected |
| --- | --- | --- |
| H1 | Ready + start | Hat playing UI; clue visible to describer; masked for others |
| H2 | Turn actions | Correct/guess/skip flows match `hat:*` handlers |
| H3 | Turn expiry | Server ticker advances or ends turn per rules |

## Imposter

| Step | Action | Expected |
| --- | --- | --- |
| I1 | Ready + start | Reveal step; only subject sees role tap sequence |
| I2 | Pass-the-phone | Each player completes reveal; then host guide screens |
| I3 | Host advances guides | Pregame → discussion → warning → results |
| I4 | Results | Imposter names + word shown; matches dealt round |

## Production-shaped check (optional)

```bash
pnpm run build
pnpm run start
```

Open `http://127.0.0.1:3001/` and repeat **S1–S5** for one game kind. For Docker changes, also run `pnpm run docker:build` (see `docs/VERIFICATION.md`).
