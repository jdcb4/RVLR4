# RVLRY Android

Standalone offline pass-and-play Android app, derived from RVLR4.

Includes **Who What Where**, **Hat Game**, **Imposter** and cooperative **Trivia**, all visible on the picker with independent local saves. RVLRY is a free app for adults, with no ads or in-app purchases. Simple mode selects easy automatic words/questions for new play and makes no child-suitability promise. React/Vite/Capacitor renders the phone UI; a native SQLite plugin supplies durable checkpoints and lifecycle handling. No backend or multiplayer connection is required.

Five app-wide themes are included. Four historical design demos live in [docs/design/aesthetic-demos/index.html](docs/design/aesthetic-demos/index.html); the current runtime uses shared theme-aware screens.

## Develop and verify

Use Node 22 and pnpm 9.12.0. Install with `pnpm install --frozen-lockfile`.
`pnpm dev` starts the browser preview. `pnpm run verify` runs type checking,
lint, tests, and a production web build.

## Android

Android APK is the default export and current release target for simplicity and
cost. iOS exports are available only on explicit request through the documented
[Codemagic IPA process](docs/IOS.md). Eventual Play Store and App Store distribution
is the long-term goal; store release preparation is separate from test exports.

Use Android Studio with its bundled Java runtime and an Android SDK.

- `pnpm android:build` builds web assets, syncs Capacitor, and builds a debug APK.
- `pnpm android:sync` refreshes the Android project's web assets.
- `pnpm android:test` runs native unit tests.
- `pnpm android:test-device` runs native instrumented tests on a connected device/emulator.

See [Android build and phone testing](docs/ANDROID.md). The app ID is
`au.joed.rvlry`. Debug APKs are for the initial phone test; release signing and
Play distribution remain gated by the [release preparation checklist](docs/release/google-play/README.md). Do not push this Android branch to the
original application's Railway-connected branches.

## Documentation

- [iOS port, Codemagic builds and sideload testing](docs/IOS.md) — unsigned IPA builds for tester-side signing; iPhone acceptance pending.
- [Project index](docs/PROJECT_INDEX.md)
- [Future work](docs/ROADMAP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Save durability](docs/PERSISTENCE.md)
- [Decisions](docs/DECISIONS.md)
- [Changelog](docs/CHANGELOG.md)
