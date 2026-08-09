# Multiplayer manual QA matrix

Use this checklist before a release or after meaningful changes to `server/`, `src/features/multiplayer/`, or Socket.IO event shapes.

**Setup:** two browsers (or one browser + one private window), `pnpm run dev`. Host uses `/` → Host a game; guest uses Join + room code from host.

Environment variables are documented in `docs/DEPLOYMENT.md`. Optional diagnostics: set **`MULTIPLAYER_DEBUG=1`** when starting the Node server to print `[multiplayer]` lifecycle lines (no secrets).

## Smoke (all games)

| Step | Action                                          | Expected                                                                                         |
| ---- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| S1   | Host creates room                               | Redirect to `/name`, then `/room/:code`; code visible; QR/copy work                              |
| S2   | Guest joins same code + name                    | Both see lobby; player lists match                                                               |
| S3   | Guest toggles ready                             | Host sees ready state; non-host footer shows ready button                                        |
| S4   | Host reviews Start before requirements pass     | Start is disabled and the readiness card lists every current blocker                             |
| S5   | All ready → Host starts                         | Phase becomes playing; correct shell loads                                                       |
| S6   | Refresh or briefly disconnect a guest mid-lobby | The stored session re-binds automatically; room sync resumes and the next lobby command succeeds |

## Who What Where

| Step | Action        | Expected                                                  |
| ---- | ------------- | --------------------------------------------------------- |
| W1   | Ready + start | WWW playing UI; teams preserved from lobby                |
| W2   | Non-describer | Cannot start turn / mark actions meant for describer only |
| W3   | Turn timer    | Behaviour matches domain rules; sync updates              |

## Hat Game

| Step | Action        | Expected                                                     |
| ---- | ------------- | ------------------------------------------------------------ |
| H1   | Ready + start | Hat playing UI; clue visible to describer; masked for others |
| H2   | Turn actions  | Correct/guess/skip flows match `hat:*` handlers              |
| H3   | Turn expiry   | Server ticker advances or ends turn per rules                |

## Imposter

| Step | Action               | Expected                                              |
| ---- | -------------------- | ----------------------------------------------------- |
| I1   | Ready + start        | Reveal step; only subject sees role tap sequence      |
| I2   | Pass-the-phone       | Each player completes reveal; then host guide screens |
| I3   | Host advances guides | Pregame → discussion → warning → results              |
| I4   | Results              | Imposter names + word shown; matches dealt round      |

## DrawNGuess

| Step | Action                                            | Expected                                                                                                  |
| ---- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| D1   | Ready + start with predetermined prompts          | Drawing turn loads; each player sees only their own assigned prompt                                       |
| D2   | Draw on a mobile viewport                         | Whiteboard accepts touch/pointer input; submit moves that player to waiting                               |
| D3   | Submit all players before timer ends              | Room advances automatically without host action                                                           |
| D4   | Let timer expire with a missing or draft response | Server auto-submits the draft or a clear placeholder after the grace window                               |
| D5   | Reconnect during drawing or guessing              | Player returns to the same private assignment and submitted/draft state                                   |
| D6   | Guessing turn                                     | Player sees only the assigned drawing and can submit/edit before deadline                                 |
| D7   | Presentation                                      | Each player sees only their own book and can page through it locally                                      |
| D8   | Final gallery                                     | Player selector opens any book with the page-by-page display; export/share preserves drawing aspect ratio |

## Production-shaped check (optional)

```bash
pnpm run build
pnpm run start
```

Open `http://127.0.0.1:3001/` and repeat **S1–S5** for one game kind. For Docker changes, also run `pnpm run docker:build` (see `docs/VERIFICATION.md`).
