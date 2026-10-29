# Verification

For iOS, the Codemagic workflow runs the shared checks, native Swift SQLite tests
and an unsigned iPhone build. See [IOS.md](IOS.md) for real-phone acceptance.
The initial 0.43.0 local checks passed 413 Vitest tests, typecheck/lint/build,
release iOS asset sync, Android unit-test task and debug APK assembly. No Android
device was attached for instrumentation. Codemagic build #1 on 30 October 2026
passed shared checks, native Swift SQLite tests and iPhone compilation with Xcode
26.0.1 in 1m45s. The downloaded unsigned IPA passed ZIP integrity, version/platform,
release-asset and cloud SHA-256 checks. iPhone installation and acceptance remain
pending tester verification. Fallow reported
41 dead-code/dependency findings and nine duplicate groups; the native Capacitor
dependencies are required despite its JavaScript-only graph warning.

Run `pnpm run verify` before behavior commits: TypeScript app/config checks, ESLint, Vitest and Vite production build. `pnpm run test:coverage` produces optional Istanbul coverage. Legacy server-only coverage targets were removed with the server, not disabled for surviving code.

Run `pnpm android:build`, `pnpm android:test`, and `pnpm android:test-device` for native integration milestones. The latter requires an emulator or authorized phone. Browser-only tests do not prove Android durability. Follow the Pixel acceptance checklist in [ANDROID.md](ANDROID.md), including installing over an existing APK without uninstalling.

For significant changes run `pnpm dlx fallow --no-cache --format human`; review actionable findings and report the actual outcome. Fallow health thresholds are review signals, not a reason to weaken tests. Its entry list includes app, UI gallery, tests and maintained scripts. Native Capacitor dependencies can be false positives for the JavaScript graph.

Validate save isolation, delayed/failed writes, duplicate actions, corrupt-current fallback, unsupported versions, lifecycle concealment and persisted random choices. Timed games also need pause/resume and expiry boundary checks. Privacy games need same-player concealed re-reveal and intentional final disclosure.

No Railway deployment or multiplayer QA applies to this standalone branch. CI targets android-prototype. Use `pnpm audit --prod` for production dependency review and `pnpm audit` for toolchain review.

Content updates: pnpm content:build validates/replays the reviewed publication ledger; pnpm content:check-deploy checks the static deployment; pnpm content:verify-live verifies actual HTTPS pack hashes, schemas, CORS and unknown-path404 behavior. Unit tests cover additive omission, explicit tombstones, duplicate/revision rejection, app upgrades, failed writes and activation retry. ContentUpdaterAppTest drives the real Settings service through native SQLite, offline startup and saved-game isolation using disposable fixture databases. The production endpoint is also checked separately, so fixtures cannot mask missing public hosting.
