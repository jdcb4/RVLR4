# Changelog

Notable changes by version. Newest at the top. Bumps follow `docs/VERSIONING.md`.

## 0.15.5 - 2026-05-12

- **Multi-Device WhoWhatWhere + Hat:** End-turn cue now fires on every
  transition out of stage `turn` — manual End-turn tap, timer expiry, or
  running out of words — instead of only when the local timer hit zero.
  A describer who ends the turn early still gets the audible beat, and the
  whole table hears it in sync via the server's sync push. The 10-second
  warning cue is unchanged.

## 0.15.4 - 2026-05-12

- **Mode-switch navigation:** The "Use Pass-and-Play mode" card moves from
  under the Multi-Device landing header to the **bottom of the page**, keeping
  the join/host flow as the dominant content above the fold.
- **Pass-and-Play hub:** Now shows a mirroring **"Use Multi-Device mode"** card
  in the same bottom position, with the inline header switch-link removed for
  consistency.
- **Refactor:** Shared `src/components/ModeSwitchCard.tsx` drives both
  surfaces so the layout stays in sync.

## 0.15.3 - 2026-05-12

- **Pass-and-Play final results:** Collapses the previous three actions
  (`Pick another game` / `Replay` / `New game`) into **two**, matching the
  Multi-Device shape:
  - `Pick another game` — back to the Pass-and-Play hub at `/passnplay`.
  - `Play again` — back to **the settings screen** for the current game with
    the user's previous prefs intact, ready to tweak and start.
- **WhoWhatWhere:** New `playAgainFromSettings` controller action lands on the
  `settings` mode (was `landing`); the legacy `playAgain` / `backToSetup`
  remain in the controller for resume + back-button paths and may be cleaned
  up in a later Fallow pass.

## 0.15.2 - 2026-05-12

- **Router:** Pass-and-Play hub moves from `/legacy` to **`/passnplay`**;
  `/legacy` keeps working as a permanent redirect so shared links survive.
- **Internal links:** Home page "Just one phone?" card now targets
  `/passnplay`.
- **Docs:** `docs/ARCHITECTURE.md` and `docs/PROJECT_INDEX.md` describe the
  two modes as peers and note the redirect.

## 0.15.1 - 2026-05-12

- **Home (UX):** "Legacy pass-and-play" reframed as **Pass-and-Play mode**.
  The home page replaces the small footer link with a prominent secondary
  card directly under the header — "Just one phone? Use Pass-and-Play mode" —
  so the alternative mode is one tap from the landing screen instead of
  buried below the host cards. Multi-Device remains the default mode.
- **Pass-and-Play hub:** copy drops "Legacy" framing; the back-link now
  reads "Switch to Multi-Device mode".
- **Plan:** New `docs/MODE_RENAME_PLAN.md` captures the broader rename +
  structural refactor sequence; this release ships step 2.

## 0.15.0 - 2026-05-12

- **Who What Where:** New **Hints per turn** setting (0–3, defaults to **0**)
  exposed in Game settings (legacy + lobby). When > 0, the describer sees a
  **Hint** button under the current word with a remaining-count badge. Tapping
  reveals the bundled hint from `words.generated` and consumes one of the
  turn's hint slots. The button greys out when the per-turn budget hits 0 or
  when the hint for the current word is already revealed. Hints reset on every
  new turn and on every word change (correct / skip / return-skipped).
- **Domain:** `revealHint(match)` in `src/domain/whowhatwhere/game.ts` is the
  single source of truth; `ActiveTurn` gains `hintsRemaining` and
  `currentWordHintRevealed`. Engine tests cover the no-op-when-zero,
  decrement-and-reveal, double-tap-idempotent, reset-on-word-change, and
  budget-exhausted paths.
- **Multiplayer:** New `www:revealHint` Socket.IO event (Zod-validated, empty
  payload) handled by `applyWhoWhatWhereRevealHint` on the server; only the
  active describer can invoke it. Existing `scrubActiveTurn` in
  `server/wwwViews.ts` already empties `.hint` for non-describers, so the
  reveal stays describer-only across the wire.
- **Persistence:** `whowhatwherePersistence.normalizeMatch` backfills
  `hintsRemaining` and `currentWordHintRevealed` for in-flight saved games
  predating this version.
- **Hat Game:** Unchanged — hints are Who What Where only.

## 0.14.10 - 2026-05-11

- **A11y:** `src/index.css` adds a `@media (prefers-reduced-motion: reduce)`
  rule that disables the `.animate-confetti-fall` animation. Users with the
  OS-level reduced-motion setting enabled no longer see the falling-confetti
  animation on the final results screen (the spans still render, they just
  stay put). Confetti is decorative, so silencing it removes vestibular load
  without removing meaning.

## 0.14.9 - 2026-05-11

- **Multiplayer UX:** `RoomPage` now surfaces a polite "Reconnecting…" banner
  after the socket has been disconnected for 2s (debounced — short blips don't
  flash). Priority order: server-shutdown banner (0.14.5) > reconnecting
  banner. Both render across every render path; fatal `bindError` keeps its
  existing full-page screen.

## 0.14.8 - 2026-05-11

- **Refactor:** `MultiplayerGameShell` and `MultiplayerEndGameActions`
  (`src/features/multiplayer/MultiplayerGameShell.tsx`) replace the duplicated
  `<FooterActionLockContext.Provider><GameShell>…</GameShell></FooterActionLockContext.Provider>`
  wrapper and the duplicated `GameResultActions` + `buildMultiplayerReplayUi`
  block across `HatMultiplayerView`, `WhoWhatWhereMultiplayerView`, and
  `ImposterMultiplayerView`. No intended UX change.
- **Fallow:** clone groups 31 → 18, duplicated lines 1109 → 638 (-42%),
  functions above complexity threshold 115 → 69.

## 0.14.7 - 2026-05-11

- **Tests:** `server/socketSmoke.test.ts` — first end-to-end Socket.IO
  integration test. Boots an in-process HTTP + Socket.IO server, walks 1 host +
  3 guests through HTTP create/join, `session:bind`, ready handoff, and
  `lobby:startGame`, asserting every client receives a `phase: "playing"` sync
  with a Who What Where match. A second case proves the Zod wrapper rejects
  malformed payloads (string in a boolean field) with the canonical
  `"Invalid request."` error.

## 0.14.6 - 2026-05-11

- **Tests:** `server/roomStore.test.ts` — 24 cases covering `createRoom`
  (team-game/Hat/Imposter shapes, name trimming, fallback, unique codes),
  `joinRoom` (team-balancing, Imposter capacity, lobby-phase enforcement, Hat
  clue draft seeding, team overflow rejection), `authenticate` (happy/wrong
  secret/unknown room/unknown player), `computeResumeEligible`,
  `archiveRoomAfterAllPlayersOptedOut`, and `peek`. First server-side test
  coverage of room lifecycle invariants.

## 0.14.5 - 2026-05-11

- **Server:** `SIGTERM` / `SIGINT` trigger a 500ms graceful shutdown
  (`server/index.ts`) — the server emits `server:shuttingDown`, then closes
  `io` and the HTTP server before exiting. Hard exit after 5s if anything
  hangs. Railway/Docker redeploys no longer kill in-flight matches without
  notice.
- **Client:** `useRoomChannel` listens for `server:shuttingDown` and exposes
  `shuttingDown: boolean`. Reconnecting clears the flag.
- **Multiplayer UX:** `RoomPage` shows a fixed top banner — "The server is
  restarting — keep this tab open, the room will reopen in a moment." — while
  `shuttingDown` is true, across every render path (lobby, playing, ended,
  reconnect).

## 0.14.4 - 2026-05-11

- **Server (deploy hardening):** `CLIENT_ORIGIN` is now **required** in
  production. `loadServerEnv` fails fast via `superRefine` when
  `NODE_ENV=production` and the variable is unset or whitespace-only. Removes
  the previous fallback that resolved CORS to `cors({ origin: true })`
  (allow-any) in that situation. Development without `CLIENT_ORIGIN` still
  defaults to `http://localhost:5173`.
- **Tests:** `server/env.test.ts` locks in the new behaviour (5 cases:
  defaults, production happy path, missing/empty CLIENT_ORIGIN refused,
  `MULTIPLAYER_DEBUG` coercion).
- **Docs:** `docs/DEPLOYMENT.md` documents the requirement under a new
  "Required production env vars" section and on the Railway checklist.

## 0.14.3 - 2026-05-11

- **Server (hardening):** All Socket.IO event payloads now validated through Zod
  in `server/socketSchemas.ts`. The `registerHandler` wrapper rejects malformed
  payloads with `{ ok: false, error: "Invalid request." }` before any state
  mutation. `session:bind` uses `sessionBindSchema`. Complex payloads
  (`lobby:hostPatch*`) still defer to existing inner field validation in
  `server/lobbyControl.ts`; the schema layer guarantees they at least arrive as
  objects.

## 0.14.2 - 2026-05-11

- **Refactor:** `server/socketHandle.ts` — `registerHandler` wrapper centralizes
  the try/ack/`requireActor` pattern shared by every Socket.IO listener;
  `socketHandlers.ts` migrated. No behaviour change. Removes ~120 lines of
  per-handler `try { … } catch { ack({ok:false, …}) }` boilerplate flagged by
  Fallow as the largest in-file clone family.

## 0.14.1 - 2026-05-11

- **Deploy:** `Dockerfile` no longer sets `NODE_ENV=production` before `pnpm install` / `pnpm run build`. With production set first, pnpm skipped **devDependencies**, so **`tsc` was missing** on Railway (`sh: tsc: not found`). `NODE_ENV=production` is applied **after** the Vite build so the runtime image still runs in production mode.

## 0.14.0 - 2026-05-10

- **Server — room lifecycle:** `Room.lastActivityAt` bumped from `broadcastRoom`; **`startRoomIdleSweeper`** (`server/roomSweep.ts`) removes rooms after **30 minutes** without sync activity **or** **10 minutes** with every player disconnected (still soft-only: whole room delete, then `disconnectSockets` on `room:{code}`).
- **Server — hub resume:** `RoomPlayer.optedOutOfResume`, socket **`room:optOutResume`**, **`archiveRoomAfterAllPlayersOptedOut`** (`phase: ended`, snapshots cleared). **`GET /api/rooms/:code`** adds **`resumeEligible`** (needs an in-progress match, a connected player, and someone who has not left for the hub). Sync only builds WWW/Hat payloads when **`phase === "playing"`**.
- **Client — hub:** **`leaveMultiplayerRoomForHub`** clears the active-game bookmark and emits opt-out; landing uses **`resumeEligible`**; **`RoomPage`** handles **`ended`** with a short “table closed” message.
- **Imposter (online):** **`scrubRoundForViewer`** restores **secret word** and **self imposter id** after parallel reveal for guide rounds so the clue **Remind me** card can flip to real copy. **`ImposterRemindMeCard`**, next-step cards, and **`phaseAdvance`** tone between steps.
- **Hat (online):** Describer gets the **spectator phase banner**; timer row spans full width; **return-skipped** Web Audio cue (multiplayer + `hatGameActionSound`); **`HatLastTurnCard`** hides skipped clue chips (WWW unchanged). Shared **`multiplayerUpNextHeadingTitle`** for “You’re up next” / “Your team is up next” / team name on ready + footers.
- **WWW (online):** Shared **`formatWwwTurnClock`** for describer/guesser timer shape; **return-skipped** sound on restore; **finalSummary** final scores play win/lose tones; ready/footer up-next copy aligned with Hat.

## 0.13.3 - 2026-05-10

- **Fix:** `registerSocketHandlers` now imports Who What Where helpers from `wwwRuntime.ts` (including `startWhoWhatWhereMatch`) and **awaits** `startWhoWhatWhereMatch` so starting a WWW game works.
- **Tooling:** `smoke:server-imports` also loads `server/wwwRuntime.ts`.

## 0.13.2 - 2026-05-10

- **Fix:** `imposterRuntime` imported `assertLobbyReadyForImposterStart` from the wrong module (`roomStore`); it now imports from `lobbyControl` so the dev server starts and `/api/rooms` works again.
- **Tooling:** `pnpm run smoke:server-imports` also loads `server/imposterRuntime.ts` to catch similar export mismatches early.

## 0.13.1 - 2026-05-10

- **Phase 4 — polish:** Manual multiplayer QA matrix ([`docs/MULTIPLAYER_QA.md`](MULTIPLAYER_QA.md)); preset verification table updated in [`docs/VERIFICATION.md`](VERIFICATION.md); README, AGENTS, PROJECT_INDEX, ARCHITECTURE (title + env/config split), DEPLOYMENT, and SECURITY cross-linked or extended.
- **Server:** Optional **`MULTIPLAYER_DEBUG`** (`server/env.ts`) enables `[multiplayer]` lifecycle logs via `mpDebug` — room create/join (HTTP), session bind, match start — **no secrets** (`server/multiplayerDebug.ts`).

## 0.13.0 - 2026-05-10

- **Imposter (online):** Full networked match from lobby through results — `lobby:startGame` calls **`startImposterMatch`**, per-viewer sync via **`buildImposterSyncDto`** (scrubbed roles + reveal rotation hints), Socket.IO **`imposter:dispatch`** for reveal steps and host-only guide transitions, and **`ImposterMultiplayerView`** on `/room/:code`.

## 0.12.0 - 2026-05-10

- **Hat Game (online):** Full networked match flow — `lobby:startGame` builds a **`HatGameSession`** from the lobby roster with **server-generated celebrity clues** (from `clueSuggestions.json`), Socket.IO **`hat:*`** actions wrapping `applyHatGameAction`, **describer-only** clue text with masked payloads for teammates/observers, server **turn expiry ticker**, and **`HatMultiplayerView`** in `/room/:code`.

## 0.11.1 - 2026-05-10

- **Who What Where (online):** Single footer step between turns — **Start turn** only (no separate “Describer ready” tap); waiting players see **Waiting on {name}, from {team}**.
- **Tooling:** `pnpm run smoke:server-imports` loads `server/roomStore` with `@/` aliases via `tsx` (avoids fragile `tsx -e` on Windows).

## 0.11.0 - 2026-05-10

- **Multiplayer foundation:** Express HTTP API (`POST /api/rooms`, `GET /api/rooms/:code`, `POST /api/rooms/:code/join`) plus **Socket.IO** (`session:bind`, `room:sync`, lobby + WWW gameplay events). Authoritative in-memory rooms keyed by six-character codes (`server/`).
- **Who What Where online:** Full networked flow from lobby through results — server-side timers, describer-only controls, scrubbed words for teammates/observers, reconnect secrets in `sessionStorage`.
- **UX:** New `/` landing (**Join** + **Host**), `/name`, `/room/:code` with QR + copy-link sharing, legacy pass-and-play preserved at `/legacy` and `/games/*`.
- **Docker:** Runtime image now serves **Vite `dist/` + Node** (no nginx-only static container).
- **Hat / Imposter online:** Lobby + settings scaffolding supported server-side; match start returns a clear “coming soon” message until engine wiring lands in a follow-up.

## 0.10.0 - 2026-05-10

- **Imposter (`/games/imposter`):** Full pass-and-play flow — landing with **Resume game** (localStorage, same discard-new-game pattern as Hat), **Game settings** (player count 4–10, imposter count with sensible defaults and caps), flat **Player roster** + **Review**, private **role/word** reveals (Hat-style handoff), four **round guide** screens (pregame → discussion → reveal warning → scripted reveal of imposter(s) and secret word), then **Pick another game** / **Replay** / **New game**. Secret words are drawn only from `src/data/imposterWords.json` (small seed list). Domain helpers in `src/domain/imposter/`; future **Theme** word subsets are stubbed in `themeWords.ts` with no UI yet.
- **Hub:** Imposter card copy updated from “coming soon.”

## 0.9.2 - 2026-05-10

- **Shared layouts:** **`BetweenTurnsLayout`** (ready + final turn recap stack for WWW and Hat) and **`LandingScreenLayout`** (shared **`GamePanel`** shell + resume / discard-confirm slots; WWW keeps keyboard-safe outer section). Refactor only — intended UX parity with previous screens.

## 0.9.1 - 2026-05-10

- **Who What Where:** Last team roster step footer primary **Finalise teams** (was **Start local round**).

## 0.9.0 - 2026-05-10

- **Final results (WWW + Hat):** Shared **`FinalResultsBody`** — hero winner/tie callout, **Final Leaderboard** with primary tint for winners + podium-ish ranks 2–3, **Best turn** card (player prominent, large score, team muted). **`ResultsConfetti`** (Tailwind **`confetti-fall`** keyframes; no new deps). **`GamePanel`** title **Final Results** on both games; Hat drops phase subtitle.
- **Shared mapping:** `mapFinalResultsFromWww` / `mapFinalResultsFromHat` in **`final-results/viewModel.ts`**.

## 0.8.0 - 2026-05-10

- **Final turn recap (WWW + Hat):** After the last timed turn, a recap modeled on **Between turns (ready)** without round/phase/scoreboard — **That’s the last turn**, last-turn card (**`LastTurnCard`** / **`HatLastTurnCard`**), **Next steps** → footer **Final scores** → overall results. Hat **`HatGameSession.stage`** gains **`finalSummary`** and **`view-results`** action before **`results`**.
- **Who What Where:** Replaced **`FinalSummaryScreen`** with **`FinalTurnRecapScreen`**.
- **Shared:** **`ThatsTheLastTurnCard`**, **`finalTurnRecapCopy`**, **`ReadyNextStepsCard`** optional give-phone line.

## 0.7.0 - 2026-05-10

- **Between turns (WWW + Hat):** Shared stack — heading (`GamePanel`), **`LastTurnCard`** / **`HatLastTurnCard`** (expandable Words), **`ReadyProgressCard`** (Round or Phase), **`GameScoreboard`** (ring highlights **last turn’s team**, not upcoming), **`ReadyNextStepsCard`**. WWW ready removes back button and round categories blurb; footer primary **`[Describer name] Ready`**.
- **Review teams:** WWW **Next steps** copy starts at “After you start…”; primary footer **`Start the game`**. Hat **Next steps** uses **`text-typ-body`** to match WWW.
- **Shared components:** **`WwwLastTurnCard`**, **`HatLastTurnCard`**, **`ReadyProgressCard`**, **`ReadyNextStepsCard`**, **`readySharedClasses`**; **`GameScoreboard`** prop renamed to **`highlightTeamId`**.

## 0.6.0 - 2026-05-10

- **Who What Where:** **`WwwLandingScreen`** (hub-style landing + optional **`ResumeGameCard`**); footer primary **Start game** / **Start new game** (discard confirm). **`WwwReviewTeamsScreen`** after roster steps (**Review teams** + **Next steps** cards); **`review`** mode before creating the match.
- **Hat Game:** Landing matches WWW (**ResumeGameCard**, footer **Start new game**); **`Game settings`** title with turn length + skips; **`AppSnapshot`** stores setup prefs for **`createHatGameSession`**; **Review teams** uses shared **`ReviewTeamsPanel`** + **Next steps** card.
- **Shared:** **`TeamRosterSetupScreen`** — players + **Add player** in body only; primary Next/Start lives in **`GameShell`** footer (`teamRosterAdvanceLabel`). **`ResumeGameCard`**, **`ReviewTeamsPanel`**, **`reviewTeamMappers`**, **`formatSavedAt`** lib helper.
- **Removed:** `ResumePrompt.tsx` (replaced by landing flow).
- **UI gallery:** WWW landing + review slides; Hat/WWW settings pairing unchanged structurally.
- **Docs:** `docs/SCREENS.md`, `docs/UI_GALLERY.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_INDEX.md`, `docs/DECISIONS.md`.

## 0.5.3 - 2026-05-10

- **UI gallery:** Re-paired the first slides — Hat **landing** + WWW explainer (WWW has no in-route landing), then **Game settings** on both sides; **Team 1 roster** pairs Hat team setup with WWW team 1. Fixes the previous “off by one” Hat-vs-WWW alignment at the start of the strip.

## 0.5.2 - 2026-05-10

- **Theming:** Semantic color tokens (`--semantic-*` in `src/themes/default.css`, Tailwind `semantic` colors). Components use `bg-semantic-*` / `border-semantic-*` instead of palette utilities with `/opacity`; blends live only in theme CSS. Gallery chrome uses `semantic-gallery*` tokens; `gallery.html` is included in Tailwind content.
- **Docs:** [`docs/THEMING.md`](THEMING.md), [`docs/DECISIONS.md`](DECISIONS.md), [`docs/ARCHITECTURE.md`](ARCHITECTURE.md), [`docs/PROJECT_INDEX.md`](PROJECT_INDEX.md).

## 0.5.1 - 2026-05-10

- **Docs:** Added [`docs/SCREENS.md`](SCREENS.md) — screen map with recognizable names for UX discussions; linked from [`docs/PROJECT_INDEX.md`](PROJECT_INDEX.md).

## 0.5.0 - 2026-05-10

- **Typography system:** Named tiers **`text-typ-*`** — CSS variables (`--font-tier-*` in `src/index.css`) drive size, line-height, and letter-spacing; Tailwind maps them in `tailwind.config.ts`; `src/typography/tiers.ts` exports a **`typography`** map for components.
- **Components:** Replaced raw `text-sm` / `text-xl` / `tracking-*` usages across games, shared chrome, and the UI gallery with tier classes.
- **`Button`:** Corrected **`className` merging** (`cn(buttonVariants(...), className)`); default label size uses **`text-typ-ui`**.
- **Docs:** [`docs/TYPOGRAPHY.md`](TYPOGRAPHY.md), [`docs/ARCHITECTURE.md`](ARCHITECTURE.md), [`docs/DECISIONS.md`](DECISIONS.md), [`docs/PROJECT_INDEX.md`](PROJECT_INDEX.md).

## 0.4.0 - 2026-05-10

- **Shared UI:** All Who What Where screens under `GameShell` now use **`GamePanel`** (settings, team roster, resume prompt, final summary, results). Ready and active turn already used it.
- **Hat Game:** Team roster step wraps **`TeamRosterSetupScreen`** in **`GamePanel`** with **`omitHeading`** so titles stay in one place (matches WWW team setup).
- **Imposter:** Placeholder route wraps content in **`GamePanel`**.
- **`GamePanel`:** Optional **`className`** for flex/min-height layouts; **`TeamRosterSetupScreen`** supports **`omitHeading`** when the parent supplies headings.
- **Docs:** `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` describe **`GamePanel`** as the default for new game routes.

## 0.3.3 - 2026-05-10

- **Dev UI gallery:** First slide uses Hat Game **landing without a saved game** so it aligns with Who What Where **settings** (no “resume” mismatch between columns).

## 0.3.2 - 2026-05-10

- **Dev tooling:** Added a separate **UI gallery** (`pnpm run ui-gallery`, `gallery.html` + `vite.ui-gallery.config.ts`) showing Hat Game and Who What Where screens side by side with fake data — not included in the default production build.

## 0.3.1 - 2026-05-10

- **Hat Game (turn):** Metrics use the same **2×2** grid as WhoWhatWhere (time left, phase name, score, skipped-waiting count). Skipped-clues panel includes the helper line “Pick a waiting word to return to it now.”
- **Who What Where (between turns):** Ready screen matches Hat-style **single outer `GamePanel`**; scoreboard uses shared **`GameScoreboard`** (Hat list UX); **`LastTurnCard`** recap uses muted rounded panel styling with collapsible words preserved.

## 0.3.0 - 2026-05-10

- **Shared chrome:** `FooterActionLockContext` + `GameFooterButtons` (`PrimaryFooterButton`, `SecondaryFooterButton`, etc.), `GamePanel`, `TurnPlayHighlight`, `GameScreenHeaderActions`. Hat Game renamed from hat-only context; shell wraps full game so in-flow controls respect the same brief footer lock as primary actions.
- **Hat Game:** Removed duplicate header **Exit** (Home covers leaving). Skip/Correct use outline + primary styling with icons; skip uses secondary/outline for parity with WWW.
- **Who What Where:** Primary flows use `GameShell` sticky footer (settings, resume, ready handoff, turn Skip/Correct, final summary, results). **End turn** moved to header like Hat Game. Active turn UI aligned with Hat (`GamePanel`, shaded highlight, dashed skipped list, 2×2 metrics kept). Ready flow uses lifted handoff state + same footer lock timing as Hat (`FOOTER_ACTION_LOCK_MS`).
- **Removed:** `hatActionLockContext.tsx` (superseded by shared footer context).

## 0.2.9 - 2026-05-10

- **Hat Game (UI):** Moved dispatch sound cues into `hatGameActionSound.ts` with unit tests; `useHatGameApp` delegates to `playHatGameActionSoundEffects` after a successful engine transition.

## 0.2.8 - 2026-05-10

- **Hat Game (domain):** Refactored `applyHatGameAction` — extracted `buildActionRuntime` and `applyTurnInteractionAction` so routing vs mid-turn logic is easier to follow (no behaviour change).

## 0.2.7 - 2026-05-10

- **Tooling:** Added `pnpm run fallow:hygiene` (dead-code + duplication only). Documented in `docs/VERIFICATION.md` how full Fallow differs from the hygiene subset when interactive complexity thresholds are noisy.

## 0.2.6 - 2026-05-10

- **Domain:** Shared `buildLeaderboardRowsFromTeams` in `src/domain/shared/teamLeaderboard.ts` — removes duplicated sort/map logic between Hat Game and WhoWhatWhere (Fallow duplication scan).

## 0.2.5 - 2026-05-10

- **Tooling:** Removed unused `globals` devDependency (Fallow unused-deps scan); added `docs/FALLOW_PLAN.md` to track hygiene follow-ups from Fallow.

## 0.2.4 - 2026-05-09

- **Repo:** Removed optional `_reference/` upstream clone folder (local-only; was gitignored). Dropped `_reference` from ESLint, Vitest, Fallow, and `.gitignore`; updated `docs/PROJECT_INDEX.md`.

## 0.2.3 - 2026-05-09

- **Hat Game setup:** Matches WhoWhatWhere — pick 2–4 teams first, then step through each team with 2–6 players per team (starts at 2; add/remove like WWW).
- **Shared UI:** `TeamCountOptionGroup`, `TeamRosterSetupScreen`, `OptionGroup` under `src/components/`; roster limits in `src/config/teamRoster.ts`.
- **App info:** Shared `AppInfoOverlay` + `AppInfoHeaderButton` — both games show **JDPassNPlay** and package version (WhoWhatWhere replaces header sparkles with the same “i” control as Hat Game).

## 0.2.2 - 2026-05-09

- **GitHub Pages:** Set Vite `base` to `/JDPassNPlay/` so asset URLs match the repository path (fixes blank page when the repo name casing differs from `/jdpassnplay/`).
- **GitHub Pages:** After `build:pages`, copy `index.html` to `404.html` so SPA routes work on refresh and direct links.

## 0.2.1 - 2026-05-09

- WhoWhatWhere team setup: removed footer negative margins that caused horizontal scroll; tightened player rows with `min-w-0` / `overflow-x-hidden`.
- Hat Game results footer: full-width stacked actions (match WhoWhatWhere); footer always uses a single column.
- Clear persisted match when a game reaches **final results** (WhoWhatWhere + Hat Game) so **Resume** only applies to in-progress play; stale completed saves are discarded on load.
- Hat Game phase cues use bundled `OneWord.wav` and `Charades.wav` (from `src/assets/audio/`).

## 0.2.0 - 2026-05-09

- Hub home screen with cards for **Who What Where**, **Hat Game**, and a placeholder **Imposter** route.
- Ported **WhoWhatWhere** domain, UI, `localStorage` persistence, and Web Audio cues from the reference project; final results offer **Pick another game**, **Replay**, and **New game**.
- Reimplemented **Hat Game** from the Expo reference as a web feature (same rules engine and JSON data); local persistence; short Web Audio cues for most events; same three result actions.
- Shared **GameShell** layout (safe areas + keyboard-friendly scroll margins) and `GameResultActions` for consistent mobile-first UX.
- **Deferred / follow-up:** Imposter is stub-only.

## 0.1.0 - 2026-01-01

- Initial scaffold from the Project Initiation `client-only` preset.
