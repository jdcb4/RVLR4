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

| Step | Action                                              | Expected                                                                           |
| ---- | --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| I1   | Ready + start                                       | Each device shows only its own reveal prompt; role/word stays private until tapped |
| I2   | Each player confirms their role on their own device | Host guide unlocks after all confirms; no pass-the-phone handoff in multiplayer    |
| I3   | Host advances guides                                | Pregame → discussion → warning → results                                           |
| I4   | Results                                             | Imposter names + word shown; matches dealt round                                   |

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
| D9   | Edit while another player submits or reconnects   | Local text, whitespace, and in-progress drawing stay intact; stale-turn requests fail                     |
| D10  | Dense drawing and slow draft acknowledgement      | Input stops at the shared limit with a notice; Undo/Clear recover; only one draft request is in flight    |
| D11  | Reload final gallery and change replay votes      | Reload restores all books; routine updates reuse cached packets without changing the displayed gallery    |

## Recovery and keyboard access

| Step | Action                                                                  | Expected                                                                                                      |
| ---- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| R1   | Open QR, About, move-player, and room-options dialogs with the keyboard | Named dialog, Close focus, background controls inert, Escape closes and restores the opener                   |
| R2   | Navigate away with another tab still bound, then close the last tab     | Seat stays online until its last connection leaves; no stale room updates                                     |
| R3   | Guest leaves lobby; host removes an away guest                          | Seat is freed, old credentials cannot restore it, remaining players can start                                 |
| R4   | Host ends a match through Room options                                  | Confirmation names discarded progress; everyone returns to lobby with roster/settings preserved               |
| R5   | Disconnect during replay, reconnect, and offer again                    | Old offer is cancelled; a fresh offer can be accepted by every player                                         |
| R6   | Replace the local server with an active room open                       | Reconnect explains that the room is gone, clears stale credentials, and offers a new room                     |
| R7   | Visit an unknown route or encounter a route load error                  | Home/Reload recovery works without a blank page                                                               |
| R8   | Use option selectors and DrawNGuess text entry                          | Selected state is exposed, inputs have labels, errors are associated, routine room updates do not steal focus |

## Responsive layout

Check at 280×653, 320×653, 390×844, and 667×375 CSS pixels. Include
Pass-and-Play screens when changing shared setup controls or the page shell.

| Step | Action | Expected |
| ---- | ------ | -------- |
| V1 | Visit both game pickers, enter a name, and open lobby settings | No page-level horizontal scrolling; cards and inputs fit their containers |
| V2 | Open Imposter player counts and Who What Where / Hat setup | Options wrap as needed without overlapping; each target stays at least 44px wide and high |
| V3 | Open the room QR dialog; draw and submit a DrawNGuess response, then enter a guess | Dialog, canvas, toolbar, and text entry fit; footer actions remain reachable |
| V4 | Scroll long content and use the primary footer action | Content scrolls vertically without trapping or covering the footer |

Measure document width and overflowing descendants inside the shell's scrolling
region. Checking only the document misses content clipped by `overflow-x-hidden`.
Exclude deliberately scrollable regions, such as the Hat readiness table, and
screen-reader-only text. Viewport emulation does not replace physical-device QA.

## Production-shaped check (optional)

```bash
pnpm run build
pnpm run preview
```

Open `http://127.0.0.1:3001/` and repeat **S1–S5** for one game kind. For Docker changes, also run `pnpm run docker:build` (see `docs/VERIFICATION.md`).
