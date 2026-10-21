# Android builds and phone testing

## Current milestone

0.25.0 is a debug-signed device-test prototype for Who What Where. Hat Game,
Imposter, remote word installation and friend-release signing follow the Pixel
checkpoint. The Settings entry truthfully indicates no update source is configured.
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
5. Try Home/Back, repeated taps, and opening/closing the skipped-word dialog.
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

## Phone UX review

Joe's first phone feedback confirms interruption recovery but identifies substantial
UX work: thumb reach, visible word history, explicit current/next participants,
round/team position, stronger grouping and hierarchy, and starting a new game
without first resuming the saved one.

The [clickable phone storyboard](design/phone-flow-proposal.html) is a design
proposal, not shipped behavior. It preserves the existing warm/teal identity and
explores a consistent round/team tracker, larger bottom actions, visible recent
words, full turn recaps, explicit handoffs and direct resume/new-game choices.
Illustrative content and limited interactions are labeled in the artifact.
The tracker is informational; it must not navigate the game state.

The existing rules give every team one turn per round and rotate that team's
presenter on its next turn. A recap must retain the completed turn's identity even
after the domain has advanced to the next team. Round boundaries and the final
turn must be presented separately. The resume/new-game choice must be reachable
before restoration sends the user straight to the paused screen. Replacing a
save requires confirmation; resumable state must remain intact until the new
state is durably committed.

This proposal focuses on Who What Where. Hat Game and Imposter need separate
role/privacy and phase reviews before adapting the same visual principles;
their flows must not inherit Who What Where's team/round assumptions.

### Pending Kestrel feedback

Published 21 October 2026: [phone UX review](https://kestrel.home.jboxtv.com/review/rvlry-phone-ux-review).
Producer: `rvlry-android`; publication: `rvlry-phone-ux-review`; revision: `2`.
Context: `codex-thread:01a158c2-05c5-71e0-8f92-6cf82c2fb324/rvlry-phone-ux`.
The reproducible payload is `design/kestrel-phone-ux-review.json`.
Kestrel carries the companion screen review and answer form; its renderer cannot
embed the styled interactive mockups, which remain in the linked storyboard and
JNAS Media/DropBox. Publishing was confirmed by the client.

When resuming this UX work, use the Kestrel skill to fetch `rvlry-android` responses
before asking the questions again or implementing an assumed direction. Match the
publication, revision and context, durably record answers and pending work, then
acknowledge receipt. No responses have been collected or acknowledged yet.
Submission does not automatically start an agent; the next-step answer determines
whether to implement, revise mockups or discuss on the next authorized resume.

### Design feedback incorporated — 21 October 2026

Joe selected the compact two-level tracker over the whole-game grid. Use it
between turns, with numbered teams; remove it during active play. Keep a compact
game mark and round in the play header, a larger timer, more visible recent words
and large bottom actions. Category-labeled clue panels use distinct proposed
colors: Who lilac, What green, Where blue. Color must supplement the label.

The resume/new-game screen belongs inside the selected game, not the game hub.
Display the save's date/time and useful game context; omit explanations of what
saving means. Setup saves each team and advances to the next, then reviews the
roster before starting. Keep the presenter's acknowledgement on handoff.

Avoid duplicated information across headings, tracker, body text and buttons.
Remove redundant next-up paragraphs, completed-turn explanations and next-round
bubbles. Pause needs its existing actions and a compact presenter/time/score
summary. Final results add best turn (player, team, points) and most skips over
a player's game (player, team, count). Proposed counting is skip actions, with
tied leaders displayed together; do not claim this is already implemented.

Aim for a single screen at normal phone text sizes with tight vertical grouping.
Allow controlled scrolling for genuinely long lists, keyboard or accessibility
sizes rather than shrinking text or targets. Review notes belong outside the
phone frame, never in app copy. Updated storyboard interactions and all eight
sample screen layouts were checked at 412px and 360px widths. The APK is unchanged.
Kestrel had no pending responses when checked before this revision; this feedback
came directly from the chat. Revision 2 asks only for remaining feedback/next steps.
