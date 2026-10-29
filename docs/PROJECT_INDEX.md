# RVLRY Android project index

The current deliverable is a standalone offline Android app for adults with Who What Where, Hat Game, Imposter and Trivia, all visible on the picker. Each game has its own native durable session. Simple mode selects easy automatic words/questions for new play; it makes no child-suitability promise. The app is free with no ads or in-app purchases. The original multiplayer server/client and Draw & Guess are removed; git retains their history.

## Active boundaries

- `ios/` — Capacitor iOS host, native SQLite and keep-awake; sideload build workflow.
- `android/` — Capacitor Android host; native SQLite snapshots and keep-awake.
- `capacitor.config.ts` — application ID, bundled web assets and host configuration.
- `src/app/` — standalone routing and Android Back dispatch.
- `src/features/passnplay/` — prototype picker and app information.
- `src/features/whowhatwhere/` — converted controller, full setup/game recovery and UI.
- `src/services/nativeSnapshotStore.ts` — ordered validated saves and recovery.
- `src/services/deviceLifecycle.ts` — native/DOM lifecycle coordination.
- `src/domain/` — independent Who What Where, Hat, Imposter and cooperative Trivia game rules.
- `src/features/hat-game/`, `src/features/imposter/` — native session/controller/page conversions.
- `src/features/trivia/` — cooperative quiz with shared answers and independent recovery.
- `src/features/game-app-hooks/` — stable controller binding and bounded-history measurement.
- `src/components/` — shared phone shell and UI.
- `src/data/` — bundled words and Trivia; installed content merges through `src/services/contentPacks/`.
- `scripts/android-build.ps1` — repeatable build/test commands.

## Commands

See `package.json` and [README](../README.md). Run `pnpm run verify` for
integrated TypeScript/UI regression checks. Run `pnpm android:build` for a
fresh APK. Native storage/lifecycle checks additionally require the Android
commands in [ANDROID.md](ANDROID.md); browser tests alone do not verify them.

## Active documentation

- [iOS builds and sideload testing](IOS.md) — Codemagic, unsigned IPA and phone acceptance.
- [Roadmap](ROADMAP.md) — future work only.
- [Content updates](CONTENT_UPDATES.md) — additive words/Trivia installation, stable public endpoint and cumulative publishing ledger.
- [Trivia content storage](TRIVIA_CONTENT.md) — question schema, durable storage, 600-question bank and editorial audit.
- [Trivia discovery](TRIVIA_DISCOVERY.md) — confirmed cooperative direction, source findings and ingestion candidates; no candidate bank approved.
- [Google Play preparation](release/google-play/README.md) — draft listing/privacy materials, guarded bundle builds and remaining release gates.
- [Android build and testing](ANDROID.md) — local toolchain, APK and device checks.
- [Persistence](PERSISTENCE.md) — current Android save contract and historical browser saves.
- [Word catalogue](WORD_CATALOGUE.md) — answer conventions, difficulty/Simple selection, historical metadata and original-source provenance.
- [Architecture](ARCHITECTURE.md) — Android entry point and retained legacy architecture.
- [Decisions](DECISIONS.md), [Changelog](CHANGELOG.md), [Versioning](VERSIONING.md).
- [Verification](VERIFICATION.md), [Screens](SCREENS.md), [Theming](THEMING.md),
  [Typography](TYPOGRAPHY.md), [Audio](AUDIO.md), [UI gallery](UI_GALLERY.md).

`DEPLOYMENT.md` describes local APK delivery. Historical MULTIPLAYER_QA and DRAWNGUESS material is not applicable to this branch. Completed implementation plans are retired into canonical docs and changelog/git.
