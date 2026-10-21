# RVLRY Android

Standalone offline pass-and-play Android app, derived from RVLR4.

Version 0.26.3 refines the reviewed phone UX to playable **Who What Where**.
The first Pixel 10 interruption tests passed; Hat Game and Imposter remain later milestones.
The APK has no multiplayer routes or backend dependency. Historical multiplayer
source/tests remain in this checkout during the staged conversion, but are not
reachable or imported by the app entry point.

## Develop and verify

Use Node 22 and pnpm 9.12.0. Install with `pnpm install --frozen-lockfile`.
`pnpm dev` starts the browser preview. `pnpm run verify` runs type checking,
lint, tests, and a production web build (including retained legacy-source checks).

## Android

Use Android Studio with its bundled Java runtime and an Android SDK.

- `pnpm android:build` builds web assets, syncs Capacitor, and builds a debug APK.
- `pnpm android:sync` refreshes the Android project's web assets.
- `pnpm android:test` runs native unit tests.
- `pnpm android:test-device` runs native instrumented tests on a connected device/emulator.

See [Android build and phone testing](docs/ANDROID.md). The app ID is
`au.joed.rvlry`. Debug APKs are for the initial phone test; release signing and
friend distribution are a later gate. Do not push this Android branch to the
original application's Railway-connected branches.

## Documentation

- [Project index](docs/PROJECT_INDEX.md)
- [Implementation plan and remaining milestones](docs/ANDROID_IMPLEMENTATION_PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Save durability](docs/PERSISTENCE.md)
- [Decisions](docs/DECISIONS.md)
- [Changelog](docs/CHANGELOG.md)
