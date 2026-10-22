# RVLRY Android

Standalone offline pass-and-play Android app, derived from RVLR4.

Version 0.28.0 includes **Who What Where**, **Hat Game**, and **Imposter**, each with an independent local save. React/Vite/Capacitor renders the phone UI; a native SQLite plugin supplies durable checkpoints and lifecycle handling. No backend or multiplayer connection is required.

Four offline design demos live in [docs/design/aesthetic-demos/index.html](docs/design/aesthetic-demos/index.html). They are isolated studies; the production aesthetic remains unchanged.

## Develop and verify

Use Node 22 and pnpm 9.12.0. Install with `pnpm install --frozen-lockfile`.
`pnpm dev` starts the browser preview. `pnpm run verify` runs type checking,
lint, tests, and a production web build.

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
- [Future work](docs/ROADMAP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Save durability](docs/PERSISTENCE.md)
- [Decisions](docs/DECISIONS.md)
- [Changelog](docs/CHANGELOG.md)
