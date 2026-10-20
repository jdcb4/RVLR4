# RVLRY Android implementation plan

Status: implementation underway; first Who What Where device-test milestone.
Prepared: 20 October 2026.
Source baseline: RVLR4 `dev`, commit `8245a0e`, version 0.24.12.

## Current implementation boundary

Version 0.25.0 implements the native host, snapshot/lifecycle infrastructure
and Who What Where prototype. Hat/Imposter, downloadable word bundles, release
signing and final removal of retained historical source remain after the Pixel
checkpoint. The APK has no multiplayer routes or server dependency; retained
source is still covered by the existing checks. See `ANDROID.md` for builds and
the device checklist. Runtime/native verification results are recorded there
after the integrated checks.

## Outcome and scope

Build a standalone, offline Android app for pass-and-play Who What Where,
Hat Game, and Imposter. Joe's Pixel 10 is the primary acceptance device;
friends can sideload signed APKs. Verify the phone's actual Android and
WebView versions during testing rather than assuming a version from “latest.”

Priorities, in order:

1. Preserve game progress and recover predictably from interruptions.
2. Deliver comfortable, polished phone interactions.
3. Provide dependable installation and upgrades.

Use React, TypeScript, Vite, and Capacitor as the starting stack. Keep the
existing game rules, bundled content, useful tests, and visual identity.
Rewrite controllers, persistence, navigation, and layouts where necessary.
Native-rendered screens are not a requirement.

Remove multiplayer, Socket.IO, Express, DrawNGuess, room credentials,
Railway deployment, and mode switching from the standalone application.
No accounts, cloud saves, backend, Play Store release, or iOS in this scope.
No automatic import of saves from the separately installed browser app.

Optional, user-triggered word-pack updates are in scope. Gameplay remains
offline; a fixed HTTPS JSON source supplies new content without an APK update.
The source does not exist yet. A public raw JSON file, including a Gist, is
sufficient for the initial release; no custom backend is required.

## Evidence and remaining uncertainty

The previous baseline verification passed type checking, lint, all 349 tests,
and the production web build. These are not Android acceptance results.

Useful existing boundaries:

- `src/domain/*`: game rules and setup validation.
- `src/features/*`: game-specific controllers and screens.
- `src/services/savedStates/*`: versioned, validated save formats.
- `src/data/*`: content bundled locally.
- `GameShell` and shared game panels: an existing mobile-oriented UI.

Identified adaptation work:

- The router opens multiplayer; some shared Home buttons point there.
- Saves currently depend on browser localStorage and effects after rendering.
- Who What Where saves setup values but not the whole setup navigation state.
- Timed games use absolute deadlines; interruption currently consumes time.
- Hat and Imposter retain private reveal state in saved snapshots.
- Native Back, app lifecycle, and keep-awake behaviour need explicit ownership.

These findings do not establish the cause of historical multiplayer failures.
Reproducing those failures is not a prerequisite.

## Phase 1 — Establish the independent Android project

1. Preserve source history and work on an Android-specific local branch.
   Do not push changes into the original web application's deployment branches.
   Establish a separate repository destination before any remote publication.
2. Update project instructions and canonical docs for the Android product.
   Remove obsolete server/deployment rules as the associated code is removed.
   Record new dependencies and local persistence decisions in `DECISIONS.md`.
3. Inspect installed Node, pnpm, Java, Android Studio, SDK, and emulator tools.
   Select compatible stable Capacitor/plugin versions and pin the toolchain.
4. Add the Android project and reproducible web-build/sync/APK commands.
   Bundle all gameplay assets; release builds must not use a development server.
5. Define a stable application ID, app name, icons, and version-code policy.
   Establish signing-key custody before distributing updateable builds.
6. Replace the launcher with the three-game picker. Remove excluded routes,
   server code, unused dependencies and their tests in bounded changes;
   retain and run all relevant game tests.

Exit: the Android shell launches offline in an emulator, shows the intended
picker, and contains no reachable multiplayer experience.

## Phase 2 — Build durable saves and interruption handling

The coordinator owns the persistence and lifecycle contracts before game
adapters are delegated. Each game keeps its own rules and controller; shared
infrastructure must not become a generic all-games reducer.

### Save contents and storage

Store a complete resumable snapshot per game, including:

- Schema version, game identity, revision, and save timestamp.
- Settings, names, current setup step/index, and unfinished form entries.
- Teams, scores, turn/phase position, and submitted Hat clues.
- Already-generated decks, roles, words, and current positions: restoration
  must not reroll or regenerate secret game content.
- Timer running/paused status and remaining duration.

Recommended prototype storage: a small native SQLite snapshot store through
a maintained Capacitor-compatible adapter, selected after a compatibility
check. Use transactions for current/previous snapshot replacement. This is
local device storage, not a multiplayer database or a cloud service.
Retain Zod validation and explicit schema migrations. Use native Preferences
only for simple app settings if needed.

Before accepting a storage dependency, verify Android/Capacitor compatibility,
maintenance, transaction behaviour, licensing, and release-build operation.
Do not create a general database framework, event-sourcing system, or backend.
If plugin compatibility is poor, evaluate a narrow native atomic-file adapter
against the same acceptance tests before changing the plan.

### Write and recovery contract

- Serialize writes and use increasing revisions so an older async save cannot
  overwrite a newer one.
- Autosave draft edits after approximately 300–500 ms; flush on field exit,
  navigation, explicit confirmation, and backgrounding where possible.
- Save meaningful actions immediately. Do not indicate a durable save before
  storage confirms it. Keep rapid taps ordered and protect against duplicates.
- Persist the computed next state, including generated content, without
  rerunning randomness when a write is retried.
- On failure, retain the in-memory state and show an actionable retry message.
  Pause progression that depends on an uncommitted score/turn transition.
- On launch, load and validate before enabling play. Do not overwrite a save
  with initial/default state while loading.
- Retain one previous valid checkpoint. If current data fails validation,
  attempt recovery and explain any rollback. Preserve unsupported-version
  records instead of silently deleting them.
- Starting over or completing a game must not allow an old backup to resurrect
  it. Make clearing/replacing current and previous records coherent.
- Keep reusable settings/rosters separate from an unfinished session. Proposed
  behaviour: completed games are not resumable, but their setup can seed replay.
  Starting a fresh match does not unexpectedly erase reusable names/settings.

Target: confirmed actions survive restart; ordinarily no more than the latest
half-second of typing is at risk. This is a target to validate, not a promise
against storage failure. Clearing app data or uninstalling is outside recovery.

### Timers and lifecycle

- Use monotonic elapsed time while a turn is running, not a wall-clock deadline.
- On background/lock: pause, checkpoint remaining time, stop cues, release
  keep-awake, and obscure any private content.
- Foregrounding never automatically starts a countdown. Show Resume.
- Checkpoint active timer progress approximately once per second and on actions.
- On an unclean restart, restore the last checkpoint as paused. A small amount
  of time may be returned; do not charge time while the application was absent.
- Pause/resume and turn expiry must be idempotent. Rapid lifecycle events must
  not duplicate scores, finish a turn twice, or replay expired audio cues.
- Reapply keep-awake only during foreground active play; never override a
  deliberate press of the phone's power button.
- Navigate Back to the previous setup step without discarding data. During
  play, Back opens pause/leave controls. Leaving for the picker preserves saves.
- Reopening Hat clue entry or Imposter reveals returns behind a private
  handoff cover. Keep entered clues and roles intact underneath it.

Exit: deterministic save-order, failure, migration, timer, and recovery tests
pass; native storage survives emulator process termination.

## Phase 3 — Who What Where prototype and phone UX

Integrate the shared contracts into one complete Who What Where journey:
settings → teams → review → turns → recap → results → replay.

Perform a bounded screen/component review using the existing visual identity:

- Gameplay: make the word, time, and primary actions visually dominant.
  Keep secondary metrics compact and long recap/score detail expandable.
  Replace the currently unbounded skipped-word rows with an explicit bounded
  panel or sheet. Trial side-by-side Skip/Correct buttons and remove redundant
  Hat phase information. Validate these compositions on-device before accepting.
- Setup: preserve drafts, expose progress through steps, and make Back safe.
- Shell: consistent header and stable bottom actions with one scroll region.
  Assign native/system/keyboard insets to one owner; inspect the existing
  combined shell/footer bottom padding and add viewport configuration as needed.
  Ensure long player names can wrap in handoff buttons instead of overflowing.
- Fit normal gameplay/handoff screens on the Pixel 10 at default text size.
  Permit scrolling for long forms, maximum rosters, and accessibility settings.
  Never shrink text or clip controls merely to claim one-screen fit.
- Use comfortably spaced touch targets, ideally at least 48 dp-equivalent;
  check the actual rendered size and WebView scaling on the device.
- Ensure the keyboard keeps the focused field and continuation action reachable.
  Verify Gboard Next/Done, IME composition, and repeated opening/closing.
- Respect cutouts, gesture insets, system bars, font scaling, TalkBack labels,
  contrast, and reduced-motion preferences.
- Start with edge-to-edge app presentation. Trial immersive gameplay on device;
  system gestures must still reveal bars and never obscure essential controls.
- Preserve sound feedback, verify audio after resume, and provide a mute option.

Use portrait as the initial phone layout. Verify rotation does not lose data;
record any orientation restriction rather than depending on it for correctness.

Exit: installable prototype APK, automated core checks, and an emulator
interruption pass. This is the first user test checkpoint.

## Pixel 10 checkpoint

Record installed Android version, WebView version, font/display settings,
and APK version. USB debugging is optional for richer diagnostics; Joe can
also sideload the APK and report behaviour.

Run a short guided check:

1. Enter part of a roster; background, reopen, then force-close and relaunch.
2. Begin a turn; wait several seconds; lock the phone; reopen and Resume.
3. Switch apps repeatedly, including while typing and during an active turn.
4. Use Android Back and the in-app Home action without losing the match.
5. Play a complete game in airplane mode and verify sounds/keep-awake.
6. Check full-screen comfort, Gboard layout, readability, and reachability.

Do not scale the design to the other games until storage, interruption recovery,
and the shared shell meet this checkpoint. Revise architecture only if evidence
shows a concrete blocker; a wholesale native rewrite is not the default remedy.

## Phase 4 — Complete Hat Game and Imposter

After the common contracts and shell stabilize, these are independent work
packages suitable for two parallel implementation agents.

Hat Game:

- Persist partial clue edits, suggestion selections, and confirmed submissions.
- Cover private entry on interruption while retaining the active player's draft.
- Persist deck order, skips, scores, phase changes, and remaining turn time.
- Verify all three phases, phase transitions, last-turn recap, and replay.

Imposter:

- Persist partial roster/settings, dealt roles, secret word, and reveal position.
- Require a handoff confirmation after interruption; never reroll a resumed round.
- Protect private content in the Android task-switcher preview as well as in-app.
  Verify native privacy handling because a JS cover alone may arrive too late.
- Verify all player reveals, guide steps, final reveal, and replay.

Exit: complete offline journeys for all three games, using the same tested
storage/lifecycle infrastructure and coherent visual language.

## Phase 5 — Release hardening and distribution

### Optional word-pack updates

Add a small Settings screen with **Check for new words**, installed content
version, and last successful check time. Show clear checking, updated,
already-current, offline/unavailable, and invalid/incompatible-data states.
An unavailable source must never prevent starting or resuming a game.

Implementation:

1. Centralize the fixed HTTPS content URL in app configuration. No credentials,
   arbitrary URL entry, automatic polling, or background updater is needed.
   Until a real source is supplied, show “Word updates are not configured yet”
   rather than making requests to an invented endpoint.
2. Define one versioned JSON bundle containing `schemaVersion`, a monotonically
   increasing `contentVersion`, a publication timestamp, and per-game packs.
   Cover Who What Where categories/name packs, Imposter words, and Hat
   suggestion/name lists. Preserve each game's existing semantic structure.
   Downloaded content never replaces players' own Hat clue submissions.
3. Provide a sample bundle and a local validation/publishing command. The source
   owner can edit JSON, validate it, and replace the hosted file without building
   the Android app. Initial hosting/publication is a separate setup step once
   Joe supplies or selects the destination.
4. Fetch with a finite timeout and response-size limit. Validate the complete
   payload with Zod before activating it: supported schema, version, required
   packs/categories, nonempty lists, trimmed text, length/count limits,
   uniqueness, and enough content for supported game settings. Treat values as
   plain text, never markup or executable configuration. Reject malformed,
   incomplete, oversized, or incompatible bundles and report a useful error.
5. Store the validated bundle in native durable storage and switch versions
   atomically. Keep the previous valid version and immutable bundled defaults.
   Interrupted downloads/writes leave the installed pack untouched. Older or
   unchanged remote versions do not silently downgrade or overwrite local data.
6. Resolve content once when creating a new game/setup session; persist its
   version and the content needed to complete it. Ongoing setup, generated decks,
   dealt roles, and saved games keep their original content even after an update
   or fallback. A replay creating a new session can use the latest installed pack.
7. New sessions prefer the latest valid downloaded content, otherwise bundled
   content. Offer an explicit “Use bundled words” recovery option in Settings.
   This changes future sessions only and preserves all game progress.
8. Document source ownership and how to publish compatible updates. Changing
   the fixed URL itself requires an APK update, so prefer a stable URL.
   Content updates change data only; new rules or schema capabilities require
   app support. Do not expose secrets in a public content file.

This feature follows the Pixel prototype checkpoint, before the friend-test
release. Define the content-provider boundary during phase 2 so games do not
remain tied to direct JSON imports. One Sol High worker can implement the
fetch/validate/install service and its tests once that contract is stable;
the coordinator owns game integration and Settings placement.

Acceptance checks:

- A valid newer bundle changes words in new sessions without reinstalling.
- Updates never alter active/saved setup, current decks, or private assignments.
- Offline, timeout, missing source, malformed/oversized data, unsupported schema,
  and older versions leave installed content and gameplay usable.
- Process termination during installation leaves a complete old or new bundle.
- Installed content works offline after restart and survives an APK update.
- Falling back to bundled words preserves existing games.

Test the following as separate cases; they are not equivalent:

| Scenario                               | Required result                                                      |
| -------------------------------------- | -------------------------------------------------------------------- |
| Home/app switch/lock/call interruption | Paused turn; durable setup; deliberate resume                        |
| Activity recreation or process death   | Last checkpoint restores without regeneration                        |
| Force-stop and manual relaunch         | Recovery without depending on a shutdown callback                    |
| Phone reboot                           | Persisted progress restores paused and private content stays covered |
| Rapid Back/Next/Correct/Skip taps      | Ordered changes; no duplicate points or submissions                  |
| Storage error or interrupted write     | Valid old or new snapshot; visible failure/recovery                  |
| Corrupt current save                   | Recover previous valid checkpoint with clear notice                  |
| Unsupported save schema                | Preserve record; explain incompatibility                             |
| New game/completed game/relaunch       | Cleared sessions do not reappear from backup                         |
| Repeated cold starts in airplane mode  | No external service needed for any game                              |
| Larger text/small display/keyboard     | No unreachable controls or hidden fields                             |
| Rapid private handoffs                 | A double tap cannot expose the next player's role                    |
| Signed APK update over older build     | Existing supported saves remain usable                               |

Retain domain/unit tests; add meaningful persistence and controller integration
tests. Browser tests cover UI journeys; native emulator/device tests cover
storage and Android lifecycle. Add one repeatable native smoke-test path, not
multiple overlapping automation frameworks.

Run type checking, lint, relevant tests, web build, and Android debug/release
build checks. Check the Pixel 10 plus a smaller emulator at the chosen minimum
supported Android version. Record minimum support after toolchain validation;
do not infer friends' devices from the Pixel 10.

Provide a signed release APK, checksum, version/release notes, installation and
upgrade instructions, and repeatable build commands. Keep signing keys outside
Git with a recoverable backup. Decide Android backup rules deliberately so
device restore does not unexpectedly expose old private rounds.

Keep diagnostics minimal: app/OS/WebView versions, save schema/revision and
error category. Exclude names, private clues, roles, and secret words.
No analytics or automatic uploads required.

## Delegation and coordinator responsibilities

Use `gpt-6.1-sol` at `high` reasoning for bounded implementation and review.
The coordinator retains architecture, shared contracts, cross-game consistency,
integration, final review, and communication with Joe.

The current session permits the coordinator plus up to three subagents.
Normally use one or two workers; use three only when genuinely independent.
This is context and workload allocation, not a claim of unlimited tokens or
guaranteed cost savings.

| Work package                                                 | Owner                                           | Parallelism and boundary                                           |
| ------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------ |
| Architecture, state contracts, standalone project boundaries | Coordinator                                     | First; defines interfaces for workers                              |
| Android toolchain, native shell, build/signing scripts       | Sol High A                                      | Parallel with persistence work; owns Android/build files           |
| Snapshot store, write queue, recovery and timer tests        | Sol High B                                      | After coordinator contract; owns persistence modules               |
| WWW integration and shared shell                             | Coordinator, with a bounded UI worker if useful | After interfaces stabilize; one owner per shared file              |
| Hat adaptation                                               | Sol High A                                      | After Pixel checkpoint; Hat files only                             |
| Imposter adaptation                                          | Sol High B                                      | After Pixel checkpoint; Imposter files only                        |
| Independent recovery/release review                          | Sol High reviewer                               | Reviews integrated result; no concurrent editing of reviewed files |

Each assignment includes the exact objective, owned files, interfaces,
acceptance tests, exclusions, and a stopping condition. Supply focused context
instead of the entire conversation. Workers report changes, checks, unresolved
risks, and interface needs. They do not recursively delegate, change dependencies,
edit shared contracts, or publish releases without coordinator coordination.

Use non-overlapping ownership in the shared checkout; isolated worktrees only
if necessary. Package manifests, lockfiles, shared routing, and shared lifecycle
remain single-owner resources. The coordinator resolves overlap and reviews
the actual diff before integrated verification.

## Deliverables and decision gates

1. Independent Android foundation and tested persistence/lifecycle contracts.
2. Who What Where prototype APK and Pixel 10 feedback.
3. Complete three-game build with private handoff recovery.
4. Signed friend-test release with verified upgrade behaviour.

The friend-test release also includes optional Settings-based word updates,
with a real-source test if hosting has been configured, or a clearly marked
unconfigured state plus local fixture tests if the source is still pending.

Implementation can begin with phases 1–3 once this plan is accepted. Joe's
phone feedback is the deliberate checkpoint before expanding to all games.
Routine implementation choices can be handled autonomously; material changes
to the agreed experience or architecture return to Joe with concrete evidence.

When implementation is complete, move enduring rules into canonical docs,
keep shipped history in the changelog, and retire this temporary plan.

## References

- [Capacitor setup](https://capacitorjs.com/docs/getting-started/environment-setup)
- [Capacitor app lifecycle](https://capacitorjs.com/docs/apis/app)
- [Capacitor Preferences and localStorage limitations](https://capacitorjs.com/docs/apis/preferences)
- [Android immersive presentation](https://developer.android.com/develop/ui/views/layout/immersive)
- [Android keep-screen-on behaviour](https://developer.android.com/develop/background-work/background-tasks/awake/screen-on)
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
