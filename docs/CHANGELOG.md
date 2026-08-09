# Changelog

Notable changes by version. Newest at the top. Bumps follow `docs/VERSIONING.md`.

## 0.20.3 - 2026-08-09

- **Delivery workflow:** Established `dev` as the default integration branch
  and review candidate, with explicit owner approval required before promotion
  to the production `main` branch.
- **Deployments:** Mapped Railway `dev` to `dev` while retaining `main` as the
  Railway production source, and documented the live configuration contract.
- **CI:** Run the deterministic GitHub Actions gate for pushes and pull
  requests involving either `dev` or `main`.

## 0.20.2 - 2026-06-14

- **Branding:** Added RVLRY favicon and app icon assets for browser tabs,
  Apple touch icons, and installable web app metadata.

## 0.20.1 - 2026-05-28

- **Fix (mobile):** Made the shared game shell use a dedicated viewport scroll
  pane so Android scroll gestures work consistently over cards and settings
  remain reachable above the footer.
- **Fix (Hat multiplayer):** Kept focused famous-figure inputs local while
  server sync catches up, preventing Android caret jumps during clue entry.
- **Tests:** Added coverage for Hat lobby clue typing during stale sync and for
  starting a Hat multiplayer lobby after the host swaps teams.

## 0.20.0 - 2026-05-17

- **Feature (avatars):** Multiplayer avatars now carry from the lobby into Who
  What Where, Hat Game, and Imposter active game state and render on turn,
  ready, reveal, clue-starter, and results screens.

## 0.19.4 - 2026-05-16

- **Docs:** Replaced the obsolete DrawNGuess implementation plan with a
  current production reference and updated project, screen, architecture,
  deployment, roadmap, and multiplayer QA docs.
- **Cleanup:** Removed the standalone DrawNGuess prototype files now that the
  production multiplayer implementation is in `src/features/drawnguess`.

## 0.19.3 - 2026-05-16

- **UX (DrawNGuess):** Drawing and guessing rounds now play the shared
  10-second warning cue once per turn.
- **Tests:** Added coverage for the DrawNGuess warning cue on drawing and
  guessing turns.

## 0.19.2 - 2026-05-16

- **Fix (DrawNGuess):** Turns now advance automatically as soon as every player
  has submitted, instead of waiting for the timer or a host action.
- **UX (DrawNGuess):** Presentation now shows each player their own locally
  controlled book, with a Next steps card and a local path through to the final
  gallery.
- **UX (DrawNGuess):** Final Gallery keeps the player selector but displays
  selected books with the same page-by-page book view used for presentation.
- **Fix (DrawNGuess):** Full-chain image export now preserves drawing aspect
  ratio instead of stretching sketches into the export rows.
- **Tests:** Added coverage for immediate turn advancement and local
  presentation/gallery book browsing.

## 0.19.1 - 2026-05-16

- **Fix (DrawNGuess):** Final gallery packet browsing now stays local to the
  gallery view instead of sending the whole room back into reveal mode, so
  replay and pick-another-game actions remain available while reviewing answer
  packets.
- **Tests:** Added focused coverage for DrawNGuess final gallery packet access.

## 0.19.0 - 2026-05-16

- **Feature (DrawNGuess):** Exposed DrawNGuess in the multiplayer game picker
  and added the first production multiplayer UI for prompt entry, drawing,
  guessing, submitted waiting states, reveal flipbook, no-score final gallery,
  and full-chain PNG export.
- **Feature (avatars):** Added reusable multiplayer avatar catalog, avatar
  picker, bundled avatar display component, host/join payload validation, room
  player persistence, lobby sync, and avatar-aware lobby rows.
- **Feature (DrawNGuess lobby):** Added collapsible DrawNGuess settings for
  predetermined/custom prompt mode plus drawing and guessing timers.

## 0.18.0 - 2026-05-16

- **Feature foundation (DrawNGuess):** Added the pure DrawNGuess match engine
  for packet rotation, predetermined/custom starting prompts, drawing and
  guessing submissions, edit-before-lock replacement, timer auto-submit
  placeholders, private/public snapshots, reveal navigation, and no-score final
  gallery state.
- **Server foundation (DrawNGuess):** Added in-memory room state, sync DTOs,
  socket schemas/handlers, host settings patching, server-side turn expiry, and
  replay availability for completed DrawNGuess matches. The game is not exposed
  in the home picker yet.
- **Data:** Added the cleaned Easy DrawNGuess prompt list and avatar assets for
  the upcoming multiplayer UI.
- **Docs/prototype:** Added the standalone DrawNGuess mobile UX prototype and
  implementation readiness/component mapping docs.
- **Tests:** Added DrawNGuess domain and server runtime coverage.

## 0.17.13 - 2026-05-15

- **Branding:** Renamed the browser/app chrome from `JDPassNPlay` to `RVLRY`.
- **Fix (singleplayer setup):** Let the Who What Where and Hat Game team-name
  cards wrap their content instead of stretching to the bottom of the screen.
- **Refactor (sound effects):** Added a shared game sound service based on the
  multiplayer Who What Where cues and routed correct, skip, return skipped,
  ten-second warning, timeout, and result cues through it across games/modes.
- **Tests:** Added coverage for the RVLRY app metadata and legacy-to-shared
  sound cue mappings.

## 0.17.12 - 2026-05-15

- **Refactor (multiplayer lobby):** Split the shared lobby shell into
  extracted invite/share, team roster, and game-specific setup sections.
  `RoomLobbyView` now focuses on lobby page composition and ready/start wiring.
- **Tests:** Added focused lobby team coverage for captain team renaming and
  host player reassignment through the team picker dialog.

## 0.17.11 - 2026-05-15

- **Refactor (Who What Where multiplayer):** Split
  `WhoWhatWhereMultiplayerView` into a shell, cue hook, extracted body routing,
  and extracted footer routing. The main view now focuses on socket-bound
  header action wiring and shell composition.
- **Refactor (shared multiplayer endgame):** Removed the duplicate Hat
  multiplayer end-game footer wrapper now that the shared
  `MultiplayerEndGameActions` primitive is used directly.
- **Tests:** Added Who What Where multiplayer coverage for the extracted ready
  footer start-turn dispatch and passive guesser turn snapshot rendering.

## 0.17.10 - 2026-05-15

- **Refactor (RoomPage):** Extracted room connection banners, active-game
  bookmark effects, invite/share controls, share URL creation, and synced
  phase rendering out of `RoomPage`.
- **Tests:** Added room share URL coverage and focused routing coverage for
  missing-code, ended-room, and missing playing-payload states. Shared
  multiplayer room sync test fixtures now back both room page and lobby tests.

## 0.17.9 - 2026-05-15

- **Refactor (Hat multiplayer):** Split `HatMultiplayerView` into a shell,
  cue/timer hook, extracted body routing, and extracted footer routing. The
  main view now focuses on composition and socket-bound header action wiring.
- **Tests:** Added Hat multiplayer coverage for the extracted ready footer
  start-turn dispatch and passive guesser turn snapshot rendering.

## 0.17.8 - 2026-05-14

- **Refactor (shared game UI):** Extracted `TeamStandingsList` and reused it in
  Hat and Who What Where multiplayer turn snapshots.
- **Refactor (Hat singleplayer):** Centralized Hat session creation for clue
  completion and replay paths.
- **Refactor (server handlers):** Shared the host/lobby settings guard across
  Who What Where and Hat settings patch handlers. Fallow hygiene now reports no
  dead code and no duplicate code.
- **Tests:** Added `TeamStandingsList` coverage.

## 0.17.7 - 2026-05-14

- **Refactor (Imposter multiplayer):** Split `ImposterMultiplayerView` into a
  thin shell plus dedicated body, footer, and reveal-progress primitives. The
  original view now owns only tone cues, socket dispatch, and shell
  composition.
- **Tests:** Added Imposter multiplayer coverage for parallel reveal progress,
  private reveal rendering, revealed-word rendering, and footer continuation
  dispatch.

## 0.17.6 - 2026-05-14

- **Refactor (multiplayer lobby):** Extracted lobby rendering, QR invite dialog,
  ready footer, team roster controls, and per-game lobby setup panels from
  `RoomPage` into `RoomLobbyView`. `RoomPage` now keeps connection state,
  banners, room binding, and phase routing.
- **Tests:** Added `RoomLobbyView` coverage for non-host ready toggling and
  host start-game wiring.

## 0.17.5 - 2026-05-14

- **Refactor (Who What Where singleplayer):** Split footer selection and active
  screen rendering out of `WhoWhatWhereSingleplayerApp` into
  `WhoWhatWhereSingleplayerChrome`, leaving the app component focused on shell,
  header, info overlay, and controller wiring.
- **Tests:** Added landing-footer coverage for the moved saved-game discard and
  fresh-start actions.

## 0.17.4 - 2026-05-14

- **Refactor (multiplayer entry):** Extracted shared room-entry response parsing
  for host/join submission in `EnterNamePage`, removing the duplicated
  response validation/session persistence branch.
- **Refactor (multiplayer labels):** Moved game-kind display labels into a
  shared `gameKindLabel` helper used by both the home page and name-entry
  preview/copy.
- **Tests:** Added room-entry response and game-label coverage.

## 0.17.3 - 2026-05-14

- **Refactor (Imposter controller):** Extracted setup validation and fresh
  reveal-round creation into `imposterRoundFlow`. The singleplayer controller
  now uses one `startRevealRound` path for both first-round start and replay,
  removing the Fallow clone family in `useImposterSingleplayerApp`.
- **Tests:** Added pure coverage for Imposter snapshot validation and reveal
  round creation.

## 0.17.2 - 2026-05-14

- **Refactor (Hat active turns):** Extracted shared `HatActiveTurnPanel` for the
  phase banner, clue highlight, metrics, and skipped-famous-figures return list.
  Pass-and-Play and Multi-Device describer turns now share that presentation
  primitive while keeping their own action dispatch/Socket.IO wiring.
- **Tests:** Added `HatActiveTurnPanel` coverage for the shared metrics and
  skipped-clue callback.

## 0.17.1 - 2026-05-14

- **Refactor (server hygiene):** Removed unused public exports from
  `server/hatClues.ts`, `server/socketHandle.ts`, and `server/roomStore.ts`.
  Fallow dead-code findings are now clean.
- **Refactor (room store):** Centralized repeated team-counting and active
  match cleanup paths used by joins, lobby readiness, archive, and replay reset.
  Added focused `roomStore` tests for replay reset and team lobby readiness.
- **Tooling:** Ignored local `.claude/` workspace metadata in git, ESLint, and
  Vitest so deterministic checks do not scan scratch worktrees.

## 0.17.0 - 2026-05-14

- **Landing (both modes):** Reduced clutter. The top now reads just
  **"RVLRY"** in a large primary-coloured heading, followed by one
  descriptive line per mode: "Multi-Device mode — everyone bring a phone"
  and "Pass-and-Play mode — share a phone".
- **Multi-Device home:** Dropped the "Pick a game, then share the code with
  friends" subtitle under "Host a room". The game cards speak for
  themselves.
- **Multi-Device lobby:** New **share** button next to the existing copy +
  QR controls. Tap it on mobile to open the native share sheet (iOS / Android
  / Edge desktop) via `navigator.share`. Browsers without the Web Share API
  fall back to copying the link, so the button is never inert. New
  `IconShare` glyph in `src/components/icons.tsx`.
- **Build / docs:** Removed the GitHub Pages deployment path — the
  `pages.yml` workflow, the `copy-github-pages-404.mjs` script, the
  `build:pages` pnpm script, the `github-pages` MODE entry in
  `src/config/env.ts`, and the `mode === "github-pages"` branch in
  `vite.config.ts`. Updated `docs/DEPLOYMENT.md`, `docs/PROJECT_INDEX.md`,
  `docs/VERIFICATION.md`, and `docs/ARCHITECTURE.md` to reflect that Docker
  - Railway are the supported deploy targets.

## 0.16.17 - 2026-05-12

- **Hotfix (Railway):** Reverted the v0.14.4 fail-fast `superRefine` that
  required `CLIENT_ORIGIN` in production. The strict rule put Railway-style
  deployments into a crash-loop because the container doesn't know its
  public origin at startup. Behaviour now matches pre-v0.14.4:
  - `CLIENT_ORIGIN` set → strict allow-list (unchanged).
  - `NODE_ENV=production` with no `CLIENT_ORIGIN` → allow-any CORS with a
    loud warning at boot (`[server] CLIENT_ORIGIN is not set — accepting
all browser origins...`). The security signal stays visible in logs.
  - Development without `CLIENT_ORIGIN` → fallback to `http://localhost:5173`.
- **Tests:** `server/env.test.ts` rewritten — the two "refuses to load"
  cases are replaced with "loads with a warning at boot" assertions.
- **Docs:** `docs/DEPLOYMENT.md` reframed `CLIENT_ORIGIN` as recommended
  rather than required; "Required production env vars" section renamed to
  "Production env vars".

## 0.16.16 - 2026-05-12

- **Landing (both modes):** Top brand overline unified to
  "RVLRY: JD's Parlour Game Collection" (was "JD Party Games" on
  Multi-Device and "Pass-and-Play mode" on the hub).

## 0.16.15 - 2026-05-12

- **Hat (Pass-and-Play):** The colored phase banner used by Hat
  Multi-Device now also appears at the top of the in-turn screen in
  Pass-and-Play, so the describer gets the same prominent
  Phase-X-Name + instruction card.
- **Refactor:** Extracted the banner into a shared
  `src/features/hat-game/HatPhaseBanner.tsx` (was a local
  `HatSpectatorPhaseBanner` inside `HatMultiplayerView`). Both modes
  render the same component; Pass-and-Play drops the redundant
  "Phase X: name. instruction" notice paragraph below it.

## 0.16.14 - 2026-05-12

- **Hat (Multi-Device):** Phase-transition audio cues now fire on every
  device when the server pushes a new `phaseNumber` (Describe → One Word
  → Charades). Uses the same bundled `OneWord.wav` / `Charades.wav`
  assets the single-player Hat Game already plays via
  `playSoundCue("phase-one-word")` / `"phase-charades"`. New `useEffect`
  in `HatMultiplayerView` watches `session.phaseNumber` with a ref so it
  fires once per transition, not on every render.

## 0.16.13 - 2026-05-12

- **Imposter (Pass-and-Play):** Reveal screen for non-imposters had the
  wrong subtitle copy ("Give a clue that proves you know the word…"),
  describing the _clue_ phase. Replaced with "This is the secret word.
  Make sure you remember it." so the prompt matches the moment.
- **Imposter (Pass-and-Play):** Added a `ReadyNextStepsCard` under the
  role/word reveal: "Once you have memorised this, hit the button below
  and pass on to the next person." Matches the Hat-Game between-turns
  pattern.

## 0.16.12 - 2026-05-12

- **Fix (confetti z-index):** `ResultsConfetti` was `z-[9]`, which sits
  below the sticky `GameShell` footer (`z-20`) and a couple of fixed
  banners. The falling pieces visibly disappeared behind the footer.
  Bumped to `z-40` — above gameplay UI and the footer, still below the
  full-screen modals at `z-50` (AppInfoOverlay, QR toast, server-
  shutdown banner).

## 0.16.11 - 2026-05-12

- **Multi-Device names:**
  - New flat distinctive-name pool in `src/data/multiplayerDisplayNames.json`
    (~60 self-contained nicknames — `Captain Custard`, `Madame Mirth`,
    `Banjo Beatrix`, …). Replaces the previous "{team} {member}" concat
    (`Legends Gawain`, `Astronauts Sally`) which wasn't useful in a flat
    Multi-Device lobby. Pass-and-Play setup still uses the team-bound
    `namePacks.json`.
  - `EnterNamePage` persists the user's last-used display name to
    `localStorage` and prepopulates the input on the next host/join so
    repeat sessions don't have to retype.

## 0.16.10 - 2026-05-12

- **Landing (both modes):** Discrete footer attribution — "by jdcb4 ·
  v{package.version}" — rendered via new shared `LandingAttribution`
  component. Reads the current version from `package.json` so it stays
  in sync with releases.

## 0.16.9 - 2026-05-12

- **Fix (mobile padding):** The `.safe-screen` rule in `src/index.css`
  silently overrode Tailwind `px-*` utilities with `0px` on non-notched
  mobile viewports, because `env(safe-area-inset-*)` resolves to `0` there
  and the rule sits outside a Tailwind layer (so it wins on cascade). That's
  why the `px-4` → `px-5` bump in v0.16.8 did nothing visually.
- The rule now combines both with `max(1.5rem, env(safe-area-inset-*))`,
  giving 24px breathing room everywhere and respecting notched-device
  insets when they're larger. Removed the now-redundant `px-5` Tailwind
  class from the three `safe-screen` call sites.

## 0.16.8 - 2026-05-12

- **Mobile padding:** Outer horizontal padding bumped from `px-4` (16px) to
  `px-5` (20px) on `GameShell`, `MultiplayerHomePage`, and
  `PassNPlayHubPage`. Cards no longer sit flush against the phone viewport
  edge; `EnterNamePage` and `RoomPage` inherit the change via `GameShell`.

## 0.16.7 - 2026-05-12

- **Multi-Device landing (compact):** Major above-the-fold tightening so
  the page fits on a single mobile viewport:
  - Header copy trimmed ("Same scoring you already know, now simultaneous"
    dropped); top + bottom padding reduced.
  - "Ask the host for their six-character code..." paragraph removed.
  - Visible "Join code" label hidden (now `sr-only` for screen readers);
    placeholder reads `Join code. e.g. ABC123`.
  - Host-section intro shortened to "Pick a game, then share the code with
    friends."
  - Host section now wrapped in a matching card; per-game buttons become
    inner rows inside the card (smaller icons + tighter padding) so the
    visual separator between Join/Host is the card chrome itself, not
    whitespace.
  - Inter-section gaps reduced from `mb-10` (40px) to `mb-4` (16px);
    `ModeSwitchCard` top margin from `mt-8` to `mt-4`.
- **Pass-and-Play hub:** Matching treatment — header padding trimmed,
  games list wrapped in a single card with an intro line + inner game
  rows for visual parity with Multi-Device.

## 0.16.6 - 2026-05-12

- **Home UX (icons):** Three new game-specific icons replace the generic
  Sparkles / Theatre / Mask trio on both Multi-Device and Pass-and-Play
  landings:
  - `IconQuestionMark` — Who What Where (a `?` glyph)
  - `IconTopHat` — Hat Game (classic top hat: brim, crown, band)
  - `IconDisguise` — Imposter (round glasses + handlebar mustache)
- Old icons stay exported in `src/components/icons.tsx` for other surfaces
  / future use.

## 0.16.5 - 2026-05-12

- **Refactor (server):** Extract `loadHatClueDraftSlot` helper in
  `server/hatClues.ts` — owns the lobby-phase guard, clueIndex parsing +
  bounds check, and draft-row initialization that `lobby:hatSetClueCell`
  and `lobby:hatSuggestClue` both performed inline. Each handler shrinks
  from ~21 to ~6 lines.

## 0.16.4 - 2026-05-12

- **Refactor:** Extract a local `HatSpectatorTurnSnapshotCard` component
  in `HatMultiplayerView.tsx` (time-left / turn-score / describer / live
  standings). Replaces the 29-line block that was inlined identically in
  the guesser and spectator branches.

## 0.16.3 - 2026-05-12

- **Refactor:** New `singleplayerLifecycle.ts` factory module under
  `src/features/game-app-hooks/` consolidates the `startNewGame` and
  `resumeSavedGame` shapes that Hat and Imposter singleplayer controllers
  re-implemented identically. `makeSingleplayerStartNewGame` owns the
  setConfirm → drop record → clear storage → reset snapshot sequence;
  `makeSingleplayerResumeSavedGame` owns the no-record guard plus the
  optional snapshot normalizer (Hat passes one, Imposter doesn't).

## 0.16.2 - 2026-05-12

- **Refactor:** New `MultiplayerSkipCorrectFooter` component
  (`src/features/multiplayer/`) replaces the 18-line Skip + Correct
  button-pair clone shared by Hat and WhoWhatWhere multi-device turn
  screens. Owns the click-handler boilerplate (busy, error, success tone)
  so call sites are five props instead of 36 lines.

## 0.16.1 - 2026-05-12

- **Tooling (naming N5):** `scripts/audit-names.mts` learns to recognize
  the `Singleplayer` / `singleplayer` mode tokens introduced in 0.15.13.
  Final audit shows symmetric coverage — `Multiplayer*` (11) ↔
  `Singleplayer*` (9) — and zero `Www*` short-form regressions. The full
  naming-conventions ADR landed in 0.15.11 (originally tracked as N5
  in the plan).

## 0.16.0 - 2026-05-12

- **Refactor (naming N4c — WIRE FORMAT):** Rename Socket.IO events to
  match the aligned `apply*` server symbols. **Old clients will not be
  compatible with new servers.** Schedule as a single deploy.
  - `hat:markCorrect` → `hat:correct`
  - `hat:skipClue` → `hat:skip`
  - `hat:viewResults` → `hat:showFinalScores`
  - `www:finalScores` → `www:showFinalScores`
- Touches `server/socketSchemas.ts`, `server/socketHandlers.ts`, and the
  Hat multiplayer client emit calls in
  `src/features/hat-game/multiplayer/HatMultiplayerView.tsx`.

## 0.15.15 - 2026-05-12

- **Refactor (naming N4a/b):** Align cross-game `apply*` verb-noun pairs
  per `docs/NAMING.md` §4. Server-side TypeScript symbols only —
  Socket.IO wire-format event names are unchanged (N4c follows):
  - `applyHatMarkCorrect` → `applyHatCorrect` (matches
    `applyWhoWhatWhereCorrect`).
  - `applyHatSkipClue` → `applyHatSkip` (matches `applyWhoWhatWhereSkip`).
  - `applyHatViewResults` → `applyHatShowFinalScores`.
  - `applyWhoWhatWhereFinalScores` → `applyWhoWhatWhereShowFinalScores`.
- No behaviour change.

## 0.15.14 - 2026-05-12

- **Refactor (naming N3):** Drop redundant `Game` from Hat/Imposter
  helper file basenames, per `docs/NAMING.md`:
  - `src/config/hatGameDefaults.ts` → `hatDefaults.ts`
  - `src/services/hatGameSound.ts` → `hatSound.ts`
  - `src/services/hatGameStorage.ts` → `hatStorage.ts`
  - `src/services/imposterGameStorage.ts` → `imposterStorage.ts`
  - `src/features/hat-game/hatGameActionSound.ts` (+ `.test.ts`) →
    `hatActionSound.ts` (+ `.test.ts`)
  - `playHatGameActionSoundEffects` → `playHatActionSoundEffects`.
- **Kept** (NAMING.md §1 exception list): `HatGameSession`,
  `HatGameAction`, `HatGameConfig`, `HatGamePhaseMeta` domain types.
- No behaviour change.

## 0.15.13 - 2026-05-12

- **Refactor (naming N2):** Add `Singleplayer` modifier to every
  pass-and-play app, hook, controller type, and app-types module that has
  a multiplayer counterpart, per `docs/NAMING.md`:
  - Apps: `HatGameApp` / `ImposterApp` / `WhoWhatWhereApp` →
    `HatSingleplayerApp` / `ImposterSingleplayerApp` /
    `WhoWhatWhereSingleplayerApp`.
  - Hooks: `useHatGameApp` / `useImposterApp` / `useGameController` →
    `useHatSingleplayerApp` / `useImposterSingleplayerApp` /
    `useWhoWhatWhereSingleplayerApp`.
  - Controller types + screen builder names follow.
- 10 files renamed in place. Domain types `HatGameSession`,
  `HatGameAction`, `HatGameConfig`, `HatGamePhaseMeta` are kept (NAMING.md
  §1 exception list).
- No behaviour change.

## 0.15.12 - 2026-05-12

- **Refactor (naming N1):** Drop `Www` / `www` short forms in favour of
  long-form `WhoWhatWhere` / `whoWhatWhere`, per `docs/NAMING.md`:
  - 3 component renames (`WwwLastTurnCard`, `WwwReviewTeamsScreen`,
    `WwwLandingScreen`).
  - 5 function renames (`formatWwwTurnClock`, `hostPatchWwwSettings`,
    `mapFinalResultsFromWww`, `viewerWwwTeamIsWinner`,
    `reviewDisplayRowsFromWww`).
  - 7 gallery-const renames (`wwwGallery*`).
  - 7 file renames including `server/wwwRuntime.ts` etc. and the
    `src/ui-gallery/wwwGallerySessions.ts` data file.
  - Wire-format Socket.IO event prefix `www:` is **unchanged** — it's the
    case-folded `GameKind` literal per `docs/NAMING.md` §4.
- No behaviour change.

## 0.15.11 - 2026-05-12

- **Docs / tooling:** New `docs/NAMING.md` documents the canonical
  game-token, mode-modifier (`Multiplayer*` / `Singleplayer*`), and verb
  conventions. Recorded as an ADR in `docs/DECISIONS.md`. `pnpm run
audit:names` re-walks every export and emits a JSON-Lines inventory for
  re-audit. Minimal `@typescript-eslint/naming-convention` rule enforces
  PascalCase on type-like declarations; project-specific patterns are
  enforced by the audit script, not the linter.
- No code renames in this release. Steps N1–N5 follow.

## 0.15.10 - 2026-05-12

- **Refactor:** Final-results view-model collapses the 30-line clone between
  `mapFinalResultsFromWhoWhatWhere` and `mapFinalResultsFromHat` into a shared
  `buildFinalResultsVm(results, bestTurn)`. The only delta between the two
  mappers (`bestTurn.scoreDelta` vs `bestTurn.score`) is resolved at the
  caller; the leaderboard sort, podium row mapping, and tie/winner copy run
  through one code path. Fallow: 17 → 16 clone groups, 491 → 431 duplicated
  lines.

## 0.15.9 - 2026-05-12

- **Refactor:** Two shared hooks under `src/features/game-app-hooks/`
  replace duplicated state/effects between `useHatSingleplayerApp` and
  `useImposterSingleplayerApp`:
  - `useFooterActionLockOnKeyChange(key)` — owns the per-game footer-lock
    timer that was inlined identically in both controllers.
  - `useAutoHidePopup(open, onClose)` — five-second auto-hide for the info
    popup, also inlined identically in both.
- Both controllers shed their local `footerActionsLocked` state +
  matching `useEffect` blocks. Fallow: 513 → 491 duplicated lines.

## 0.15.8 - 2026-05-12

- **Refactor:** `src/components/game/buildGameLandingScreen.tsx` replaces the
  43-line clone between Hat and Imposter landing screens (largest cross-game
  clone Fallow flagged). Per-game landing modules now just supply the copy
  and their controller. Fallow: clones 18 → 17, duplicated lines 638 → 513
  (-20%).

## 0.15.7 - 2026-05-12

- **Refactor (file layout):** Per-game multi-device views move next to their
  pass-and-play counterparts:
  - `features/multiplayer/HatMultiplayerView.tsx` →
    `features/hat-game/multiplayer/HatMultiplayerView.tsx`
  - `features/multiplayer/WhoWhatWhereMultiplayerView.tsx` →
    `features/whowhatwhere/multiplayer/WhoWhatWhereMultiplayerView.tsx`
  - `features/multiplayer/ImposterMultiplayerView.tsx` →
    `features/imposter/multiplayer/ImposterMultiplayerView.tsx`
- `features/multiplayer/` keeps the mode-shell concerns: `RoomPage`,
  `EnterNamePage`, `MultiplayerHomePage`, `MultiplayerGameShell`,
  `lobbyCaptain`.
- `docs/PROJECT_INDEX.md` reflects the new layout. No UX change.

## 0.15.6 - 2026-05-12

- **Refactor (file layout):**
  - `src/features/multiplayer/LegacyHubPage.tsx` →
    `src/features/passnplay/PassNPlayHubPage.tsx`; component renamed from
    `LegacyHubPage` to `PassNPlayHubPage`.
  - Removed orphan `src/features/home/HomePage.tsx` (unused since the
    Multi-Device landing took over `/`).
  - `docs/PROJECT_INDEX.md` lists `src/features/passnplay` as a peer of
    `src/features/multiplayer`.
- No UX change.

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
  `server/whoWhatWhereViews.ts` already empties `.hint` for non-describers, so the
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
- **Hat (online):** Describer gets the **spectator phase banner**; timer row spans full width; **return-skipped** Web Audio cue (multiplayer + `hatActionSound`); **`HatLastTurnCard`** hides skipped clue chips (WWW unchanged). Shared **`multiplayerUpNextHeadingTitle`** for “You’re up next” / “Your team is up next” / team name on ready + footers.
- **WWW (online):** Shared **`formatWhoWhatWhereTurnClock`** for describer/guesser timer shape; **return-skipped** sound on restore; **finalSummary** final scores play win/lose tones; ready/footer up-next copy aligned with Hat.

## 0.13.3 - 2026-05-10

- **Fix:** `registerSocketHandlers` now imports Who What Where helpers from `whoWhatWhereRuntime.ts` (including `startWhoWhatWhereMatch`) and **awaits** `startWhoWhatWhereMatch` so starting a WWW game works.
- **Tooling:** `smoke:server-imports` also loads `server/whoWhatWhereRuntime.ts`.

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
- **Shared mapping:** `mapFinalResultsFromWhoWhatWhere` / `mapFinalResultsFromHat` in **`final-results/viewModel.ts`**.

## 0.8.0 - 2026-05-10

- **Final turn recap (WWW + Hat):** After the last timed turn, a recap modeled on **Between turns (ready)** without round/phase/scoreboard — **That’s the last turn**, last-turn card (**`LastTurnCard`** / **`HatLastTurnCard`**), **Next steps** → footer **Final scores** → overall results. Hat **`HatGameSession.stage`** gains **`finalSummary`** and **`view-results`** action before **`results`**.
- **Who What Where:** Replaced **`FinalSummaryScreen`** with **`FinalTurnRecapScreen`**.
- **Shared:** **`ThatsTheLastTurnCard`**, **`finalTurnRecapCopy`**, **`ReadyNextStepsCard`** optional give-phone line.

## 0.7.0 - 2026-05-10

- **Between turns (WWW + Hat):** Shared stack — heading (`GamePanel`), **`LastTurnCard`** / **`HatLastTurnCard`** (expandable Words), **`ReadyProgressCard`** (Round or Phase), **`GameScoreboard`** (ring highlights **last turn’s team**, not upcoming), **`ReadyNextStepsCard`**. WWW ready removes back button and round categories blurb; footer primary **`[Describer name] Ready`**.
- **Review teams:** WWW **Next steps** copy starts at “After you start…”; primary footer **`Start the game`**. Hat **Next steps** uses **`text-typ-body`** to match WWW.
- **Shared components:** **`WhoWhatWhereLastTurnCard`**, **`HatLastTurnCard`**, **`ReadyProgressCard`**, **`ReadyNextStepsCard`**, **`readySharedClasses`**; **`GameScoreboard`** prop renamed to **`highlightTeamId`**.

## 0.6.0 - 2026-05-10

- **Who What Where:** **`WhoWhatWhereLandingScreen`** (hub-style landing + optional **`ResumeGameCard`**); footer primary **Start game** / **Start new game** (discard confirm). **`WhoWhatWhereReviewTeamsScreen`** after roster steps (**Review teams** + **Next steps** cards); **`review`** mode before creating the match.
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

- **Hat Game (UI):** Moved dispatch sound cues into `hatActionSound.ts` with unit tests; `useHatSingleplayerApp` delegates to `playHatActionSoundEffects` after a successful engine transition.

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
