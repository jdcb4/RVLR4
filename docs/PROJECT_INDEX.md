# RVLRY Android project index

The current deliverable is a standalone offline Android prototype for
Who What Where. Hat Game and Imposter follow after Joe tests the foundation
on his Pixel 10. The original multiplayer source is retained temporarily for
reference/regression checks, but no multiplayer routes are in the APK.

## Active boundaries

- `android/` — Capacitor Android host; native SQLite snapshots, privacy and keep-awake.
- `capacitor.config.ts` — application ID, bundled web assets and host configuration.
- `src/app/` — standalone routing and Android Back dispatch.
- `src/features/passnplay/` — prototype picker and app information.
- `src/features/whowhatwhere/` — converted controller, full setup/game recovery and UI.
- `src/services/nativeSnapshotStore.ts` — ordered validated saves and recovery.
- `src/services/deviceLifecycle.ts` — native/DOM lifecycle coordination.
- `src/domain/whowhatwhere/` — existing game rules, retained separately from the controller.
- `src/components/` — shared phone shell and UI.
- `src/data/` — bundled words; downloadable packs are a later milestone.
- `scripts/android-build.ps1` — repeatable build/test commands.

## Commands

See `package.json` and [README](../README.md). Run `pnpm run verify` for
integrated TypeScript/UI regression checks. Run `pnpm android:build` for a
fresh APK. Native storage/lifecycle checks additionally require the Android
commands in [ANDROID.md](ANDROID.md); browser tests alone do not verify them.

## Active documentation

- [Implementation plan](ANDROID_IMPLEMENTATION_PLAN.md) — milestones and Pixel checkpoint.
- [Android build and testing](ANDROID.md) — local toolchain, APK and device checks.
- [Persistence](PERSISTENCE.md) — current Android save contract and historical browser saves.
- [Architecture](ARCHITECTURE.md) — Android entry point and retained legacy architecture.
- [Decisions](DECISIONS.md), [Changelog](CHANGELOG.md), [Versioning](VERSIONING.md).
- [Verification](VERIFICATION.md), [Screens](SCREENS.md), [Theming](THEMING.md),
  [Typography](TYPOGRAPHY.md), [Audio](AUDIO.md), [UI gallery](UI_GALLERY.md).

`DEPLOYMENT.md`, `MULTIPLAYER_QA.md`, `DRAWNGUESS.md` and historical sections
of the other documents describe the original web product, not the Android
prototype. Do not apply Railway promotion/deployment to this standalone branch.
The active plan is retired after completion; durable contracts move to these
canonical documents and shipped history stays in the changelog.
