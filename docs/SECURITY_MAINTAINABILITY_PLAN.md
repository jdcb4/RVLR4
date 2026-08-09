# Security and Maintainability Plan

Status: **active**  
Source: **RM-06**  
Audit baseline: **2026-08-09**, version **0.21.2**

This plan turns the RM-06 audit into independently reviewable work. It does
not authorize authentication, a database, or a broad rewrite. Those remain
outside the current product and architecture decisions.

## Executive summary

The core multiplayer authorization model is sound: reconnect secrets are
cryptographically random, stored per browser session, rebound after every
Socket.IO reconnect, and checked before room mutations. Active game state also
has viewer-specific projections. No committed credential files, `eval`,
`innerHTML`, or `dangerouslySetInnerHTML` usage was found.

The audit did find three priority-one areas:

1. Production dependencies include remotely reachable memory-exhaustion
   advisories in the WebSocket/Socket.IO stack.
2. A Hat lobby sync sends every player's private clue drafts to every joined
   player, although the interface only displays the current player's row.
3. Public room creation, joining, session binding, and socket mutations have
   no request budgets; DrawNGuess also enforces its eight-player maximum only
   when starting, not when joining.

Maintainability is good overall, with no detected dead files, dead exports, or
duplicate blocks. Risk is concentrated in the 727-line socket-registration
function, three large single-player orchestration hooks, and under-tested
server projection/timer paths.

## Priority definitions

- **P1 — first:** verified confidentiality or remotely reachable availability
  exposure.
- **P2 — next:** material boundary hardening, operational visibility, or a
  high-change maintainability hotspot.
- **P3 — planned:** defence in depth or targeted structural improvement with
  lower immediate risk.

## Security work

### SEC-01 — Upgrade vulnerable production dependencies (P1)

**Evidence**

- `pnpm audit --prod` reported **14 advisories: 5 high, 6 moderate, 3 low**.
- The deployed tree contains `ws@8.18.3`, affected by
  [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p),
  and `socket.io-parser@4.2.6`, affected by
  [GHSA-2m8v-j782-fhvr](https://github.com/advisories/GHSA-2m8v-j782-fhvr).
  Both advisories describe unauthenticated memory exhaustion against a server.
- `react-router-dom@7.15.0` and `nanoid@5.1.11` also have patched releases.
  Some React Router findings concern RSC features this SPA does not use, but
  carrying known vulnerable packages is unnecessary.

**Implementation**

1. Upgrade direct packages within their current major versions first,
   including React Router to at least `7.18.2` and Nano ID to a patched 5.x
   release.
2. Refresh the lockfile so `socket.io-parser` is at least `4.2.7` and `ws` is
   at least `8.21.0`. Use a narrowly documented override only if current
   Socket.IO releases do not resolve patched transitives.
3. Review every remaining audit advisory for actual runtime applicability;
   document, do not silently ignore, any accepted residual risk.

**Acceptance**

- `pnpm audit --prod` reports no high-severity advisory.
- The deterministic gate and multiplayer smoke tests pass.
- A dependency/lockfile-only commit is used unless a compatibility fix is
  genuinely required.

### SEC-02 — Keep Hat lobby clue drafts private (P1)

**Evidence**

`server/sync.ts` currently copies the complete `room.hatClueDrafts` map into
every viewer's lobby DTO. A joined player can therefore inspect every other
player's famous-figure drafts before the game starts. The client only needs
`hatClueDrafts[viewerPlayerId]`; readiness is already computed on the server.

**Implementation**

1. Project only the current viewer's draft row into `buildRoomSync`.
2. Keep the server's full draft map private for readiness and match creation.
3. Consider simplifying the wire type from a player-keyed record to a single
   `myHatClueDrafts` array so future code cannot mistake the field for public
   lobby data.

**Acceptance**

- A two-viewer server test proves each player receives their own draft and
  cannot observe another player's text.
- Hat readiness and game-start tests still use the complete server-side map.
- Two-browser Hat lobby QA passes.

### SEC-03 — Enforce room capacity when players join (P1)

**Evidence**

Imposter and team games reject joins at their capacity. DrawNGuess assigns no
join-time maximum, despite `DRAWNGUESS_MAX_PLAYERS` being eight; the start gate
rejects an oversized lobby only after all players have already been stored and
broadcast.

**Implementation**

Reject a ninth DrawNGuess player in `RoomStore.joinRoom`, using the shared
domain constant and the same clear "room is full" contract as Imposter.

**Acceptance**

- Store and HTTP integration tests cover the eighth successful join and ninth
  rejection.
- Existing capacity and start-readiness tests pass.

### SEC-04 — Add bounded public-input and mutation budgets (P1)

**Evidence**

- There is no HTTP rate limit or Socket.IO event throttle.
- Express uses the default JSON limit and Socket.IO uses its default
  `maxHttpBufferSize` rather than explicit application budgets.
- A valid DrawNGuess draft can structurally contain up to 500 strokes with
  2,000 points each. Repeated mutations are broadcast once per room viewer,
  multiplying CPU and network work.
- The current global room cap limits retained rooms but does not prevent burst
  creation, join spam, bind guessing, or mutation floods.

**Implementation**

1. Define named limits for HTTP body bytes, Socket.IO message bytes, drawing
   strokes/points/serialized size, and room/player mutation frequency.
2. Add bounded, sweepable token buckets for public HTTP routes and per-socket
   mutations. Give drawing updates their own stricter budget. Do not retain an
   unbounded map of attacker-controlled keys.
3. Configure Railway-aware client IP handling before applying any IP-based
   policy; do not trust arbitrary forwarded headers.
4. Return stable `429` HTTP responses and socket acknowledgements without
   leaking internals. Log only aggregate limit events, never secrets or clue
   content.

Socket.IO documents the server message-size option under
[`maxHttpBufferSize`](https://socket.io/docs/v4/server-options/#maxhttpbuffersize).

**Acceptance**

- Fake-clock tests cover refill, rejection, isolation between clients, and
  cleanup.
- Oversized JSON, socket payload, and drawing fixtures are rejected before
  they reach game runtime code.
- Normal DrawNGuess whiteboard use and two-browser multiplayer QA pass.

### SEC-05 — Complete schema validation at every external boundary (P2)

**Evidence**

- Four socket schemas are `z.unknown()`. Comments say their inner functions
  validate each field, but the Who What Where and Hat patch functions assign
  supplied values without that validation.
- HTTP route bodies and path parameters use TypeScript casts and manual type
  checks rather than the Zod rule documented in `SECURITY.md` and
  `ARCHITECTURE.md`.
- The malformed-payload smoke test currently exercises only `lobby:setReady`.

**Implementation**

1. Define strict, partial Zod objects for each host settings patch and reject
   unknown keys.
2. Parse HTTP request bodies and path parameters with route-owned schemas.
3. Normalize user-facing strings after parsing and keep domain-level invariant
   checks as a second boundary.
4. Correct the inaccurate comments in `server/socketSchemas.ts`.

**Acceptance**

- Tests reject wrong types, non-finite numbers, invalid enum values, out-of-
  range counts/durations, oversized strings, and unexpected properties.
- Valid partial patches retain current behaviour.
- Every HTTP and mutating socket route has an identifiable schema.

### SEC-06 — Fail closed on production origins and add baseline headers (P2)

**Evidence**

When production has no usable `CLIENT_ORIGIN`, `server/index.ts` deliberately
allows any origin. That avoided a prior Railway startup loop, but it also lets
any website initiate public room and socket traffic. The app sends no explicit
security-header baseline and advertises Express through `X-Powered-By`.

**Implementation**

1. Verify `CLIENT_ORIGIN` in both Railway environments, then restore a
   production fail-fast rule for a missing or empty allow-list.
2. Add allow-list tests for HTTP and Socket.IO handshakes.
3. Disable `X-Powered-By` and adopt a reviewed set of headers. If Helmet is
   added, record the new top-level dependency in `docs/DECISIONS.md` and tune
   CSP for Vite assets and Socket.IO rather than disabling it wholesale.
4. Update deployment diagnostics so an origin misconfiguration is obvious
   before traffic is switched.

Express's maintained
[production security guidance](https://expressjs.com/en/advanced/best-practice-security/)
recommends TLS, Helmet, secure dependency versions, input validation, and
brute-force protection.

**Acceptance**

- Production startup rejects an empty allow-list with an actionable message.
- Allowed origins work and an unlisted origin is denied in integration tests.
- Header assertions cover the Node-served SPA and API responses.

### SEC-07 — Lock down viewer projections with invariant tests (P2)

**Evidence**

Coverage for security-sensitive server views is uneven:

- `imposterViews.ts`: **1.33% lines**
- `whoWhatWhereViews.ts`: **44.77% lines**
- `hatViews.ts`: **50.9% lines**
- `drawnguessViews.ts`: **100% lines**

The Hat lobby leak passed through a highly covered `sync.ts` because no test
asserted what a different viewer must not receive. Numeric coverage alone is
therefore not sufficient.

**Implementation**

Create table-driven tests for every game stage and viewer role, asserting both
visible fields and forbidden secrets. Include lobby drafts, hidden words,
Imposter roles/word, DrawNGuess private prompts, and reconnect sync.

**Acceptance**

- Every secret-bearing projection has explicit negative assertions for an
  unauthorized viewer.
- Tests fail when a private field is copied into a general room DTO.
- The projection tests remain server-side and do not rely on UI hiding.

### SEC-08 — Add safe health and error signals (P2)

**Evidence**

Railway has no configured health-check path. The server has graceful shutdown
and opt-in lifecycle debug messages, but no minimal readiness endpoint,
structured error envelope, or Socket.IO/Engine.IO connection-error logging.

**Implementation**

1. Add a cheap health endpoint that reports only service/version/readiness,
   never room state, codes, player IDs, or secrets.
2. Configure Railway to use it after local and deployed verification.
3. Centralize redacted operational logging for startup, shutdown, unexpected
   HTTP errors, socket connection errors, and rate-limit counts.
4. Preserve the existing consent boundary for detailed multiplayer debug logs.

**Acceptance**

- Health tests cover ready and shutting-down states.
- Railway health checks target the endpoint in both environments.
- A log-capture test proves session secrets and user game content are absent.

### SEC-09 — Compare reconnect secrets in constant time (P3)

**Evidence**

`RoomStore.authenticate` uses ordinary string inequality. Tokens contain 192
bits of randomness, so this is not a practical token-recovery path by itself,
but constant-time comparison removes avoidable timing variation.

**Implementation**

Decode or buffer both values, reject invalid/unequal lengths, and use
`crypto.timingSafeEqual` without throwing on malformed input.

**Acceptance**

- Tests cover valid, invalid, malformed, and unequal-length secrets.
- Authentication keeps the same public success/failure contract.

## Maintainability work

### MNT-01 — Split socket registration by game and concern (P2)

**Evidence**

Fallow reports `registerSocketHandlers` at **727 lines**, and
`server/socketHandlers.ts` is the top six-month churn hotspot. This combines
session binding, lobby control, replay, and four game protocols in one closure.

**Implementation**

After SEC-02, SEC-04, and SEC-05 establish the correct boundaries, extract
small registration modules for session/lobby/replay and each game. Keep the
central authenticated schema wrapper as the only mutation entry path; do not
introduce a new event framework.

**Acceptance**

- The public event names and acknowledgement contract are unchanged.
- Existing smoke tests plus one registration/import test per module pass.
- No extracted module can register an authenticated mutation without the
  shared schema/actor guard.

### MNT-02 — Reduce complex runtime and projection functions (P2)

**Evidence**

The highest security-relevant complexity is:

- `applyImposterDispatch`: cyclomatic **21**, cognitive **28**, 147 lines.
- `scrubRoundForViewer`: cyclomatic **20**, cognitive **20**, 70 lines and
  almost no direct coverage.
- `RoomStore.joinRoom`: cyclomatic **12**, cognitive **15**, 59 lines.

**Implementation**

Add characterization tests first, then extract named stage/role policies and
capacity helpers. Prefer pure functions in the existing game module over
cross-game abstractions.

**Acceptance**

- Each extraction is a separate behaviour-neutral commit.
- Complexity falls below the current Fallow threshold or any remaining
  exception has a short, local rationale.
- Projection and room-capacity invariants remain explicit in tests.

### MNT-03 — Decompose large single-player orchestration hooks (P3)

**Evidence**

Fallow reports these very large hooks:

- `useHatSingleplayerApp`: **390 lines**, 18 hooks.
- `useImposterSingleplayerApp`: **300 lines**, 13 hooks.
- `useWhoWhatWhereSingleplayerApp`: **258 lines**, 18 hooks.

**Implementation**

Handle one game at a time. Separate persistence/lifecycle, transition commands,
and derived view state only where tests demonstrate a stable boundary. Do not
create a generic game hook.

**Acceptance**

- Characterization tests cover resume, discard, replay, and completion before
  extraction.
- Each game retains its current persistence schema and user-visible flow.
- Full Fallow results improve without new duplication.

### MNT-04 — Make coverage reporting decision-oriented (P3)

**Evidence**

`pnpm run test:coverage` passes **35 files / 153 tests** and reports **51.6%**
overall line coverage and **53.16%** for `server/`. The global number includes
configuration, scripts, and the development-only UI gallery, so it is not a
useful release gate by itself. Tickers and room sweeping have zero direct
coverage.

**Implementation**

1. Define a production-code coverage view that excludes configuration,
   scripts, type-only modules, and the dev-only gallery.
2. Add deterministic fake-clock tests for turn tickers and idle-room sweeping.
3. Gate high-risk projection, validation, authorization, and capacity modules
   first; avoid chasing a single repository-wide percentage.

**Acceptance**

- Coverage output clearly separates production application code from tooling.
- Security-boundary modules have explicit branch/invariant tests.
- Any numeric CI threshold is based on the new baseline and cannot be met by
  adding low-value tests elsewhere.

## Findings requiring no work

- Fallow found **0 dead files**, **0 dead exports**, and **no duplicate code
  blocks**.
- Overall maintainability is **91.7 (good)** with average cyclomatic complexity
  **2.1**; the plan targets hotspots rather than a repository-wide rewrite.
- Fallow's suggestion to move Tailwind from `devDependencies` is not actionable:
  Tailwind is a build-time tool and the compiled app does not require it at
  runtime.
- Reconnect tokens are generated from 24 cryptographically random bytes and
  are not written to server logs. Browser storage is deliberately
  `sessionStorage`, not persistent cross-session storage.
- Runtime game state remains in memory by design. This audit does not propose
  auth or a database.

## Recommended delivery order

1. **Immediate exposure reduction:** SEC-01, SEC-02, SEC-03.
2. **Abuse and boundary hardening:** SEC-04, SEC-05, SEC-06, SEC-07.
3. **Operations and defence in depth:** SEC-08, SEC-09.
4. **Complexity reduction after safeguards exist:** MNT-01, MNT-02, MNT-03,
   MNT-04.

Each item should be a focused review unit with its own tests, version decision,
and changelog entry. Behaviour changes also require the relevant two-browser
matrix in `docs/MULTIPLAYER_QA.md`.

## Audit evidence

Commands run on 2026-08-09:

| Check                                       | Result                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `pnpm audit --prod`                         | Failed: 14 production advisories (5 high, 6 moderate, 3 low).                                    |
| `pnpm outdated --format list`               | Direct updates available; security work can stay within current majors first.                    |
| `pnpm run test:coverage`                    | Passed: 35 files, 153 tests; 51.6% overall lines, 53.16% server lines.                           |
| `pnpm dlx fallow --no-cache --format human` | 25,187 LOC; good maintainability; 28 complexity findings; one dependency-classification finding. |
| `pnpm run fallow:hygiene`                   | No dead files/exports or duplication; Tailwind classification reviewed as a false positive.      |
| Tracked-file and source scans               | No tracked credential/env files or dangerous HTML/eval sinks found.                              |

The audit also reviewed the HTTP routes, environment parsing, reconnect flow,
room store, socket schemas and handlers, per-viewer sync builders, dependency
tree, security policy, architecture, deployment guidance, and current tests.

## Close-out rule

This is an active implementation plan, not a permanent architecture document.
When all accepted items are complete, preserve lasting rules in `SECURITY.md`,
`ARCHITECTURE.md`, `VERIFICATION.md`, `DEPLOYMENT.md`, and `DECISIONS.md` as
appropriate; preserve shipped history in `CHANGELOG.md`; then delete this file.
