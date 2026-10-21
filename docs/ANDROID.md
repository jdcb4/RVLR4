# Android builds and phone testing

## Current milestone

0.26.3 is the debug-signed Who What Where build with the reviewed phone UX. Hat Game,
Imposter, remote word installation and friend-release signing follow the Pixel
checkpoint. The picker has separate Settings and Info icon buttons. Settings truthfully
indicates no update source is configured.
Historical multiplayer code remains in the checkout but is unreachable from the
Android router and absent from its production route chunks.

## Toolchain

- Node 22, pnpm 9.12.0.
- Capacitor core/android/CLI 8.5.3, App plugin 8.1.2 (pinned in package.json).
- Android Studio bundled JDK 21; SDK platform 36 for compilation.
- `ANDROID_HOME` can point to the SDK; otherwise the Windows helper uses
  `%LOCALAPPDATA%\Android\Sdk`. Set `JAVA_HOME` to a compatible JDK, or let
  the helper locate Android Studio's bundled `jbr`.

The generated project's Gradle wrapper and dependency versions are tracked.
SDK packages may be installed by Gradle if their license has already been accepted.
No Android signing passwords or private keys belong in this repository.

## Commands and output

- `pnpm run verify`: typecheck, lint, TypeScript tests, production Vite build.
- `pnpm android:build`: build web, Capacitor sync, Gradle assembleDebug.
- `pnpm android:sync`: build web and sync Android assets without assembling.
- `pnpm android:test`: Gradle testDebugUnitTest.
- `pnpm android:test-device`: connectedDebugAndroidTest; needs a booted emulator
  or an authorized USB-connected Android device.

APK: `android/app/build/outputs/apk/debug/app-debug.apk`.
The APK contains the web bundle; it does not require Vite or a network connection.
Always rebuild/sync after changes before testing the APK. Debug signing is local
and temporary; preserve the debug key for prototype updates. A release identity
and separately backed-up signing key are required before wider distribution.

## Native contracts

`RvlryDevice` is a local Capacitor plugin. SQLite operations run on one worker
and atomically rotate current/previous snapshots. Callers receive success after
transaction commit. Keys and UTF-8 payload sizes are bounded (1 MiB per snapshot).
The TypeScript owner serializes reads/writes/removal and validates payloads.

Privacy window flags are enabled before web content loads; app screenshots and
recent-app previews may therefore be blank. Native onPause releases keep-awake
even if JavaScript is stalled. Back dispatches to the game before navigation;
open dialogs consume Back first. Native backups are disabled for this prototype.
Bridge logging is disabled to prevent saved clues/names appearing in debug logs.

## Pixel 10 acceptance

Install the debug APK by opening the file on the phone (allow installation from
that source when Android asks), or use `adb install -r` after explicitly enabling
USB debugging and approving the computer on the phone. Record the app, Android,
WebView and font/display-scale versions/settings with feedback.

1. Open in airplane mode and start Who What Where.
2. Partially edit names/settings, switch apps and return. Then force-stop and
   relaunch; Resume should restore the same setup step and saved entries.
3. Start a timed turn. Lock for longer than the turn duration, unlock, and Resume.
   Time should remain paused while away; no points or turns should advance.
4. Force-stop during play and relaunch. Resume should keep scores/current word
   and restore roughly the last timer checkpoint, without rerolling the turn.
5. Try Home/Back, repeated taps, retrying skipped words and scrolling their column.
6. Check keyboard visibility, long names, touch comfort, Gboard Next/Done, and
   larger font/display settings. Vertical scrolling is allowed when needed.
7. Finish a game and replay. The old completed game should not become resumable.
8. Install a subsequent APK over the existing app with the same signing key;
   confirm the saved setup/match still resumes. Do not uninstall for this test.

Automated storage tests do not replace these real-phone checks. Uninstalling or
clearing app data intentionally removes saves. Abrupt termination can lose the
last short draft interval or return a small amount of countdown time.

## Prototype verification — 20 October 2026

- `pnpm run verify` passed: typecheck, lint, 379 tests across 74 files, and
  production build.
- Android debug assembly and native lint passed. Lint retains nonfatal generated
  template, icon and dependency warnings.
- Two native JVM tests and seven device instrumentation tests passed, covering
  snapshot transactions, validation, bridge behavior, privacy and wake handling.
  Separate checkpoint write/read runs with an intervening force-stop also passed.
- A further native app-render test passed: bundled hub → Who What Where →
  game settings → Team 1 roster, with enabled controls and no storage error.
- Browser checks at 412 × 915 and 360 × 640 covered setup restoration, paused
  countdown recovery, retained scores/current word and bounded play-screen layout.
- Emulator checks use Android 15/API 35 with WebView 124. Joe subsequently tested
  the prototype on his Pixel 10 and reported no recovery issues across closes
  and force-closes. APK-over-APK upgrade testing remains unverified.
- Fallow ran and was reviewed; it was not clean (26 dead-code findings and
  54 health thresholds). Most dead code belongs to retained legacy routes;
  native runtime dependencies are not recognized by its JavaScript graph.
  The unused `concurrently` dependency was removed. Controller complexity remains
  a maintenance consideration; its behavior has dedicated tests.

The handoff artifact is `out/RVLRY-0.25.0-prototype.apk`, with a companion SHA-256
file. These local build artifacts are intentionally excluded from git.

## UX build verification — 21 October 2026

- Version 0.26.0 / Android versionCode 2: `pnpm run verify` passed typecheck,
  lint, 408 tests across 76 files and the production build.
- Debug assembly, two native JVM tests and all eight API-35 device tests passed.
  The bundled app test now covers settings, team saves, review, handoff, skip,
  correct, pause and cancelling replacement. Separate force-stop checkpoint
  write/read runs also passed.
- Installed 0.26.0 over 0.25.0 without uninstalling and successfully read the
  native checkpoint written by the old APK. Version-1 game compatibility is
  covered by controller tests; this does not replace Pixel upgrade testing.
- Browser checks at 412 × 915 and 360 × 640 covered the compact layout, saved
  recap restoration and round-complete restoration. The active screen fits at
  360 × 640 with fixed actions and bounded word columns.
- Fallow was reviewed: 26 dead-code findings and 56 health thresholds remain,
  including retained legacy routes and controller/chrome complexity. These
  findings are not a clean gate; no checks were suppressed.
- The first Gradle invocation stalled while enumerating local file systems.
  Retrying with `$env:GRADLE_OPTS='-Dorg.gradle.vfs.watch=false'` succeeded;
  the same setting was used for native verification.

Artifact: `out/RVLRY-0.26.0-prototype.apk` (8,967,927 bytes), also copied to
`\\JNAS\Media\DropBox\RVLRY-0.26.0-prototype.apk`. Both copies have SHA-256
`8557DEB3CF16A7602B87B721CF5DC616B176DC871609D2D3D735EA3B91EC9EEB`.
Install over the existing prototype to retain saves. Pixel 10 UX acceptance
for this version remains a user checkpoint.

## Current phone UX

Who What Where opens directly to settings on first use. If a session exists,
its game entry offers Resume or confirmed Start new game with the saved date/time.
The chooser lives inside the selected game, not the hub. Returning to an active
turn first opens the paused summary; a separate Resume turn starts the clock.

Setup follows Settings → Teams → Review. Save team advances through the teams;
review precedes starting the game. Handoff identifies the presenter and offers
one named confirmation that starts the turn. A completed turn gets a word recap;
a completed round adds standings before the next handoff. These presentation
phases survive interruption even though the game engine has advanced.

Between turns, violet numbered teams show current/completed/next within the
current round, visually distinct from teal action buttons. Circled team numbers
sit above a two-line name area and short status; presenter names stay in the
handoff heading rather than the tracker. The round number
lives in the top-right header; there is no separate round strip (approved Option A).
Active play omits this tracker and uses a compact game/round header, larger timer,
category-labeled colored clue, and large bottom controls. Who is lilac, What green,
Where blue. These colors supplement text and do not change game rules.

Skipped and Guessed have separate columns. All outstanding skips remain retry
buttons, including the selected word marked In play. They leave the queue only
on Correct. Both columns use available height and indicate overflow; guessed history retains
all entries, newest first. Long lists scroll inside the columns while the actions stay fixed.
Hints replace their button inside a fixed-height area; long hints scroll inside it
without moving the word columns. Configured skip limits remain supported.

Pause keeps a compact presenter/time/score summary and resume/leave/new-game
choices; End turn is available there. Final results show standings, tied best-turn
leaders (player, team, points), and tied most-skips leaders using each player's
skip actions across the game. No-skip games say No skips.

Communicate each fact once, keep vertical grouping tight, and aim for one screen
at normal phone text sizes. Keyboard, long lists and larger accessibility text
may scroll rather than shrink labels or targets. Review-only notes never belong
in the app UI. Hat and Imposter need separate role/privacy reviews.

## Design review record

Joe approved implementation in chat after three storyboard revisions. The
[storyboard](design/phone-flow-proposal.html) is a historical design reference;
the app is authoritative for implemented behavior. The Kestrel companion
[review](https://kestrel.home.jboxtv.com/review/rvlry-phone-ux-review) has producer
`rvlry-android`, publication `rvlry-phone-ux-review`, revision `3`, context
`codex-thread:01a158c2-05c5-71e0-8f92-6cf82c2fb324/rvlry-phone-ux`.
No pending answers were returned when implementation began on 21 October 2026;
none were acknowledged. Chat approval supersedes the outstanding next-step
question. Use the Kestrel skill to collect any later feedback when resuming;
submitting a response does not automatically launch an agent.

## Control refinement verification — 21 October 2026

0.26.1 / versionCode 3 passed `pnpm run verify` (408 tests / 76 files), debug
assembly and the bundled Android AppRenderTest on API 35 after installing over
0.26.0. Native storage/lifecycle code is unchanged; the full durability suite
was not repeated for this visual patch. Browser checks at 360 × 640 and
412 × 915 confirmed settings fit without scrolling, fixed play actions, growing
word columns with accurate overflow cues, and distinct recap statuses.
Fallow retains 26 dead-code findings / 56 health thresholds. The design detector
reported only the mockup's warm background, intentionally retained from the
approved incumbent palette; no style suppression was added.

APK: `out/RVLRY-0.26.1-prototype.apk`, copied and checksum-verified at
`\\JNAS\Media\DropBox\RVLRY-0.26.1-prototype.apk`. SHA-256:
`EACC45E492DF22EBB89DEB793FE4910F9964EB815F89960024E7E8ED5A05EABE`.

Joe selected Option A in chat; implemented in 0.26.2. Historical alternatives:
[progression-options.html](design/progression-options.html), also copied as
`RVLRY-progression-options.html` in that DropBox folder. A removes the round strip;
B embeds round ticks in teams; C labels the round strip; D combines round/team
position in one compact tracker. Standard UI icons now use Lucide; custom game
identity symbols remain SVG.

Kestrel publication `rvlry-progression-options`, revision 2, producer
`rvlry-android`, context
`codex-thread:01a158c2-05c5-71e0-8f92-6cf82c2fb324/rvlry-progression`:
[review and respond](https://kestrel.home.jboxtv.com/review/rvlry-progression-options).
Chat selection resolves the tracker choice. Fetch any later feedback before further changes. No pending
responses were returned at the start of this refinement. The source payload is
`docs/design/kestrel-progression-review.json`. Answers are stored in Kestrel;
submitting does not automatically launch work.

## Option A verification — 21 October 2026

0.26.2 / versionCode 4 passed the full verify command (408 tests / 76 files)
and Android debug assembly. Browser review confirmed header round plus team
boxes without the strip. No persistence or native behavior changed; native
device tests were not repeated for this removal-only layout patch.
Artifact: out/RVLRY-0.26.2-prototype.apk, copied and checksum-verified to
JNAS Media/DropBox. SHA-256: B0CBBAF619C1FD9017E3DB97192B1A9CE91F5300B3CEF31583696935AED527D6.

## Picker and handoff refinement — 21 October 2026

0.26.3 / versionCode 5 uses the same game identity symbols on the picker and
game header: person/object/location, hat with slips, and disguise mask. Standard
controls remain Lucide. Settings labels all sit beside horizontal selector rows.

`pnpm run verify` passed 410 tests across 76 files, TypeScript, lint and production
build. Android debug assembly, all eight device tests and both separate
force-stop checkpoint phases passed. Browser checks at 360 × 640 confirmed
settings fit, the four-team tracker stays 110px high even with long names, and
hint reveal leaves both word columns at the same vertical position. The existing
native app-render test now starts a turn with the single named confirmation.
Fallow remains non-clean (26 dead-code findings / 56 health thresholds), reviewed
without suppression. The scoped design detector reported no findings.

APK: `out/RVLRY-0.26.3-prototype.apk`, copied and checksum-verified to
`\\JNAS\Media\DropBox\RVLRY-0.26.3-prototype.apk`. SHA-256:
`CEDFA4B87B983C8C13675372A5142865804FC1001F2587BC0921E42D730594EA`.
