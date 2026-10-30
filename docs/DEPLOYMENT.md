# Android delivery

## Default and optional exports

**Android APK is the default export**, including when a request says only
"build", "export" or "send the app". Use `pnpm android:build` for the local APK.
Android is the current target because it is easier and cheaper to distribute.

**iOS is a supported opt-in distribution path.** Only generate an IPA or start
the Codemagic iOS workflow when Joe explicitly asks for an iOS export. Follow
[IOS.md](IOS.md) for the standard cloud build, artifact verification, re-signing
and tester acceptance process. Keep the iOS host and manual workflow available;
routine Android releases do not imply a companion iOS export.

The long-term goal is distribution through both Google Play and Apple's App
Store. Current APK/unsigned IPA exports are testing channels, not store releases.
Store signing, account setup, review and release work require a separate request;
see [roadmap](ROADMAP.md).

This branch produces a standalone APK, with a separate public static content-update endpoint. Use the Android commands in [ANDROID.md](ANDROID.md) and the endpoint publishing commands in [CONTENT_UPDATES.md](CONTENT_UPDATES.md). No Railway deployment, Docker image or original web-repository branch promotion is part of this project.

Prototype APKs are debug-signed locally. Install a subsequent build over the existing application to preserve SQLite saves; uninstalling clears them. Keep app/native versions synchronized. Copy release artifacts to JNAS Media/DropBox and compare SHA-256 after copying. APKs and generated web assets stay outside git.

App Bundle commands and release materials are documented in [Google Play preparation](release/google-play/README.md). A separately backed-up upload identity and the remaining Console/real-device gates are required before public distribution. Interactive design studies are ordinary offline HTML files with bundled assets; copy their complete folder or extract their ZIP before opening index.html.
