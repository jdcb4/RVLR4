# Roadmap

Future ideas only. Roadmap entries are **not** action items.

Do not implement anything from this list unless the user explicitly asks for that feature or moves it into an active plan.

When the user mentions a future idea that is out of scope for the current task, add it here rather than implementing it opportunistically.

## Android game ideas — requested 21 October 2026

Deferred; not part of the current implementation:

- **When category:** years/dates associated with significant historical events or famous days.

## Trivia game — requested 22 October 2026

Gameplay and storage began in 0.35.0 behind a default-off Settings toggle. The current 0.37.0 cooperative flow has no teams, uses Correct/Incorrect marks, and ends with one shared score and a scrollable recap. Reveal-after-each mode has no writing; reveal-at-end mode always offers optional shared answers with exact normalised canonical/alias matches marked Correct automatically. Other answers need a manual mark, all marks can be overridden, and revealed questions require a mark before advancing. Expired unshown questions are excluded from score and recap. See [Trivia content](TRIVIA_CONTENT.md).

- **Reviewed question corpus:** design historical-source ingestion and wider editorial review beyond the 600-question source-checked bank in 0.40.0.
- **Live question generation:** possible future extension; excluded from the first version.
- **Baseline content:** TriviaManager repo inspected; local QuickQuiz has 365 candidate entries and TriviaNightCreator has 50 demo questions. Historical Docker volumes and a preserved old cluster backup were identified; live contents remain unverified while Docker is stopped. These are ingestion candidates only, not approved questions.

## Android delivery follow-ups

- Complete Google Play release gates in [release preparation](release/google-play/README.md): publisher/account details, backed-up upload key, policy hosting, final assets and Play testing. Local AAB preparation is implemented.

## Distribution direction — 30 October 2026

- **Current target:** Android, for simpler and cheaper distribution. APK remains the default export; Play Store preparation continues only within separately requested scope.
- **Optional iOS testing:** native host and Codemagic unsigned IPA build are implemented and cloud-tested in 0.43.0. Export only when explicitly requested; phone installation/runtime acceptance remains pending. Standard process: [IOS.md](IOS.md).
- **Eventual dual-store distribution:** publish on both Google Play and the Apple App Store. Apple account/signing, signed CI uploads, TestFlight, iPhone acceptance and store review preparation remain future work. This goal does not authorize cloud builds, spending or store submissions.
