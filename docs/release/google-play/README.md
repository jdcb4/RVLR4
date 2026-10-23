# Google Play release preparation

Status: preparation only; no Play Console account, listing or release has been created or submitted. iOS is deferred at Joe's request (23 October 2026).

## Prepared scope

- App: RVLRY; existing package ID `au.joed.rvlry`. Confirm ownership/availability in Play Console before first upload; package IDs are effectively permanent there.
- Android minimum API 24; target/compile API 36. Current Google requirement for new mobile apps is API 36 (checked 23 October 2026).
- Joe confirmed free distribution, no ads and no in-app purchases. No billing, advertising, analytics or account SDK is integrated.
- Intended audience: adults. Simple mode selects easy words/questions; it is not a child-suitability feature. Trivia is always visible on the picker. See [content review](content-review.md) for full-pool rating evidence and review limits.
- Support: [rvlry@jboxgames.com](mailto:rvlry@jboxgames.com), with active inbound forwarding. The [public privacy policy](https://content.jboxgames.com/rvlry/privacy.html) and [support page](https://content.jboxgames.com/rvlry/support.html) returned HTTP 200 on 24 October 2026. App information displays the same canonical privacy source offline and loads bundled open-source notices locally.
- Signed AAB command: `pnpm android:bundle`. It requires all four process environment variables: `RVLRY_UPLOAD_STORE_FILE`, `RVLRY_UPLOAD_STORE_PASSWORD`, `RVLRY_UPLOAD_KEY_ALIAS`, `RVLRY_UPLOAD_KEY_PASSWORD`. Use an absolute keystore path (the helper resolves relative input before Gradle). Supply values through a secure secret manager/session; never put values in command history, repository files or documentation.
- The [signing runbook](signing.md) records the prepared upload key, encrypted 1Password backup, exercised recovery and credential-loading build helper. The 0.42.0 signed bundle verifies with the recorded upload certificate; local key preparation does not register the certificate with Play or enrol the app in Play App Signing.
- Explicit preparation command: `pnpm android:bundle-unsigned`. This produces an UNSIGNED AAB which cannot be submitted. It ignores signing credentials and never falls back to the debug key. Release builds freshly build/sync web assets in release mode, excluding source maps. Skipping the web build is disallowed for bundles.
- Review the listing draft, privacy source, data-safety assessment and asset inventory in this directory. No Play listing or declaration has been submitted; policy publication is tracked separately.

## Required decisions and remaining gates

1. Account: a personal account is the recommended fit for this independently developed hobby app; Google explicitly lists hobbyists under personal accounts. Joe is preparing that route. Verify account status, developer display name and legal identity in Console; registration, verification and any fees remain owner actions. A display name can differ from the legal name, but Google still displays a personal developer's legal name, country and developer email. Additional disclosure rules may apply by region. See [account types](https://support.google.com/googleplay/android-developer/answer/13634885) and [identity/public details](https://support.google.com/googleplay/android-developer/answer/13628312).
2. Signing: the dedicated upload key and encrypted backup are prepared, and independent recovery was exercised on 24 October 2026; see [signing and recovery](signing.md). The 0.42.0 AAB certificate matches the recorded public fingerprint; recheck each candidate. Play App Signing enrolment and Console certificate registration remain owner gates; Google will hold the separate app-signing key. Do not use the current debug certificate for production.
3. Prototype transition: a Play-signed installation normally cannot replace the existing debug-signed APK with the same package ID. Plan a fresh installation for testers or an explicit save-export/import feature if retention becomes necessary. Do not silently uninstall a user's app. Prerelease compatibility is optional, so the initial recommended path is a clearly communicated fresh install.
4. Privacy/support: public policy/support access was verified on 24 October 2026, under deployment `5b2a6028-ac6b-48f7-b057-961d47228f7e`. The app includes offline policy access and the confirmed support email. Check these in the final installed release, and ensure policy, app behaviour and Console declarations agree, including manual content downloads and support correspondence. Inbound forwarding does not establish an outbound support-mail identity.
5. Content/audience: complete IARC/content-rating and target-age questionnaires for the intended adult audience and all accessible game content. Removing Kids mode does not itself establish a declaration or rating. Simple mode filters difficulty only; historical alcohol/weapon/war references remain, including some easy content. Review the [content evidence](content-review.md), final marketing and actual app together.
6. Assets and rights: final phone screenshots, feature graphic, publisher-approved icon/copy; confirm ownership of original app branding/content, generated-art provenance and all distributed third-party/font/native notices. Source checks establish factual support, not ownership clearance or human approval.
7. Console: Data safety, no-ads declaration, app access (no login), content rating, adult target audience, confirmed support/policy details, countries and free pricing. All four games, including Trivia, appear directly on the picker. None of these declarations has been submitted.
8. Testing: upload signed AAB to internal testing, inspect Play pre-launch/device reports, test installation/update from Play and release behaviour on Pixel. For personal accounts created after 13 November 2023, run a closed test with at least 12 testers continuously opted in for the preceding 14 days before applying for production access. Internal testing alone does not satisfy this gate; the application also asks about testing and readiness. Completing the interval is not automatic approval. Keep tester feedback and fixes. [Google's testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465).
9. Final review: app-signing identity, privacy/rights/audience declarations, release build, staged rollout and submission are reviewed with Joe before public release. Nothing is uploaded by local build commands.

## Verification boundaries

Native debug instrumentation establishes game/storage behaviour, not successful Play upload or Play-delivered installation. Unsigned AAB validation establishes packaging, not signing readiness. A disposable local signing test, if performed, is never a production identity. Real-device acceptance and Play Console checks remain separate gates. Release build receipts are recorded in docs/ANDROID.md. The initial AAB has no native .so libraries; there is no bundled native binary requiring 16 KB page-size remediation in this build. Recheck after dependency changes.

## Official references

Personal-account identity and testing references above were checked 24 October 2026. Build/signing and declaration references below were checked 23 October 2026; reconfirm at submission.

- https://developer.android.com/studio/publish/app-signing
- https://support.google.com/googleplay/android-developer/answer/11926878
- https://support.google.com/googleplay/android-developer/answer/9859152
- https://support.google.com/googleplay/android-developer/answer/10787469
- https://support.google.com/googleplay/android-developer/answer/9867159
- https://support.google.com/googleplay/android-developer/answer/14151465
