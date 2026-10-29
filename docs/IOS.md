# iOS builds and sideload testing

The iOS port starts in 0.43.0 alongside the existing Android host on
`android-prototype`. React, game rules, content and session schemas are shared.
The iOS `RvlryDevice` implementation uses system SQLite and the same six bridge
methods as Android. No Apple account or signing material is needed to build the
unsigned device artifact; installation requires the tester to re-sign it.

## Codemagic

1. Connect the Codemagic GitHub app to **jdcb4/RVLR4 only**. Its standard
   permissions include code read, checks/statuses/hooks write and email read.
2. Add that repository to the **personal account**, select the Other/Capacitor
   project type if prompted, and use the repository's `codemagic.yaml`.
3. Select branch **android-prototype** and workflow **ios-sideload**. Start a
   manual build. There are no automatic triggers or publishing steps.
4. Download `RVLRY-<version>-unsigned.ipa`, its SHA-256 file and `BUILD-INFO.txt`
   from the completed build's artifacts. Send the IPA to the tester yourself.

The workflow uses macOS M2, Xcode 26.0 and Node 22.19.0, with pnpm 9.12.0 and a
frozen dependency lockfile. Each run has a 45-minute cap. It runs `pnpm verify`,
native SQLite regression tests, a fresh release web build, Capacitor sync and
an unsigned arm64 iPhone build. It checks the output platform and version before
packaging `Payload/App.app` as an IPA. It does not upload to TestFlight or use
Apple signing credentials. No Codemagic API token is required for browser builds.

Codemagic's published personal-account allowance is 500 macOS M2 minutes/month
(checked 30 October 2026). Account billing and queue availability still apply;
adding a payment method or changing plans is an owner action.

## Commands

- Windows or macOS: `pnpm ios:sync` builds release web assets and updates the host.
- macOS/Xcode: `pnpm ios:test` runs the Swift SQLite regression executable.
- macOS/Xcode: `pnpm ios:build` creates the unsigned device IPA under `out/ios/`.

The build script uses a fresh temporary build directory and packages no signing
identity. Do not commit IPA files, generated web assets, provisioning profiles,
certificates, build outputs or API tokens. The tracked Xcode project, shared App
scheme and Swift sources are the maintained native host. Capacitor regenerates
`CapApp-SPM/Package.swift` during sync using the installed dependency paths.

## Tester installation

Use **AltStore Classic**, not the EU marketplace product. The tester installs
AltServer on their Windows PC or Mac using the official instructions, sets up
AltStore on their iPhone and imports the IPA. Their Apple account is entered in
their own signing tool, never supplied to us or to Codemagic. Developer Mode
must be enabled where required. A free Apple account normally requires refreshing
the app every seven days through AltServer. Other trusted IPA re-signing tools
may work but are not part of the initial acceptance path.

This IPA cannot be installed directly by tapping it in Files, opening an email
attachment or downloading it in Safari. It is unsigned input for re-signing, not
an Ad Hoc signed build or an App Store upload. Keep the same signing account and
bundle identity on updates; changing them can create a separate app/data sandbox.
Do not uninstall to update: uninstalling removes saved games.

## Native behavior and acceptance

iOS 15+ is the configured minimum. The native serial storage queue commits FULL
synchronous SQLite transactions before resolving writes, retaining current and
previous snapshots and exact-current content compare-and-swap. Database files
live in backup-excluded Application Support. Screen-awake is released natively
when the app becomes inactive. Android Back handling is Android-only. Screenshot
and screen-recording behavior remains allowed, as on Android.

The Swift command-line tests exercise the production database code on macOS;
they do not prove iPhone bridge, WebKit, background suspension or re-signing
behavior. A cloud device compilation is also not a phone acceptance test.

On the tester's iPhone, record app version, iPhone model, iOS version and signing
tool, then check:

1. Install and launch in airplane mode. Open all four games; no storage error.
2. Advance past initial settings, enter names, background and force-quit. Resume
   must restore later setup; first-page settings remain temporary.
3. Start a timed turn, lock beyond its duration, unlock and resume. It stays
   paused while away. Force-quit and reopen retains scores and selected content.
4. Imposter conceals roles on background and restore without rerolling the deal.
5. Check keyboard dismissal, safe areas/home indicator, scrolling, sound after
   interruptions and screen-awake only during active play.
6. Online, manually check for new words/Trivia; return offline and resume games.
7. Install a subsequent re-signed build over the app and confirm saves remain.

## References

- [Codemagic Capacitor guide](https://docs.codemagic.io/yaml-quick-start/building-an-ionic-app/)
- [Codemagic pricing](https://docs.codemagic.io/billing/pricing/)
- [Codemagic Xcode 26 image](https://docs.codemagic.io/specs-macos/xcode-26-0/)
- [AltStore Classic Windows installation](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows)
- [AltStore refresh requirements](https://faq.altstore.io/altstore-classic/your-altstore)
