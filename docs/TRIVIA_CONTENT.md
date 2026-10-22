# Trivia content storage

Storage foundation shipped in 0.33.0; presenter-led gameplay ships in 0.35.0 behind Settings → Show Trivia (off by default). No discovered historical question bank has been imported. Version 2 of `src/data/trivia/bundled.json` supplies 30 newly written, source-checked starter questions for testing in app 0.35.1. Future publications must use a higher version.

## Records and publishing

`src/data/triviaSchema.ts` owns the strict schema. Each record has a stable `trivia:<slug>` ID, positive revision, question, answer, acceptable variants, optional explanation, one of eight agreed categories, easy/medium/hard difficulty, kids suitability, review timestamp/reviewer/source URLs and optional source-record reference. Editorial source archives and detailed review history remain separate from the runtime pack. These fields establish a review contract; schema validation cannot establish factual accuracy or substitute for human approval.

IDs and normalised question texts must be unique within a pack. Answer variants must not repeat the primary answer or each other. Unicode, case, accents and punctuation are normalised only for duplicate comparison; displayed spelling is retained. Semantic duplicates still require editorial review. Corrections to an ID present in the selected previous pack must increase its revision. Removed records disappear from new selection; IDs must not be recycled in the editorial process, including after removal.

`expiresAt` is an optional exclusive UTC timestamp, e.g. `2026-12-31T13:00:00.000Z`. Date-only values are rejected to avoid timezone ambiguity. Ingestion must convert an intended local expiry date explicitly. `isTriviaQuestionEligible` combines expiry, kids suitability and optional difficulty, and must be called before presenting any unshown question, including after resume. It uses device time; the offline app cannot establish trusted network time. Questions with no expiry remain eligible.

Publish locally after editorial review:

```powershell
pnpm publish:trivia <reviewed-pack.json> <output-directory> <https-base-url/>
```

The command validates the complete pack, refuses empty publications, writes compact `trivia-vN.json` and a matching manifest with its exact byte length and SHA-256. It refuses to overwrite existing output versions and uploads nothing. Keep its output outside committed source (for example under `out/`). Add the descriptor to the publisher's shared manifest alongside the independent word descriptor when applicable. Full source verification/ingestion and hosting remain separate work.

## Download and activation

`src/services/contentPacks/` owns a shared version-1 manifest with at most one `trivia` and one `words` descriptor. Each has an independent positive version, HTTPS URL, byte length and lowercase full-payload SHA-256. The schema already recognises word packs using the existing catalogue schema, but the existing word-game adapters still use their bundled data. Word activation/UI integration is not implemented by this milestone.

`CONTENT_MANIFEST_URL` is null until a maintained publisher exists. Checking returns `unconfigured` without network access. Future Settings integration calls the bounded downloader, then the matching installation service. Downloads omit credentials, reject redirects, time out after 20 seconds and enforce 64 KiB manifests / 8 MiB packs while streaming. Use final HTTPS asset URLs, not redirecting Gist share links. HTTPS authenticates the publisher; the hash detects mismatched/corrupt payloads, not a compromised publisher. No signing infrastructure is introduced.

Trivia installation verifies exact downloaded bytes, UTF-8, hash, schema, kind/version, duplicate identities and question revisions before writing. It rejects downgrades and unknown installed schema versions. Installation errors leave stored content intact. Load tries validated current, previous, then bundled content and reports fallback warnings for the future UI. Reads failing altogether block installation rather than treating storage as empty.

## Native durability and isolation

The `RvlryDevice` bridge exposes `readContent` and `installContent`. `rvlry-content.db` stores current/previous pack bodies as ordered BLOB chunks of up to 256 KiB, avoiding Android CursorWindow limits. This database is separate from the 1 MiB game-snapshot database. Transactions use FULL synchronous commit; acknowledgement follows commit. Native code validates size/kind/header/version and exact-current compare-and-swap, and retains only an existing checkpoint chosen by the validating TypeScript layer. Failed or interrupted transactions cannot publish partially installed packs. Maximum size is 8 MiB per pack; the previous slot can hold another 8 MiB.

The browser development adapter uses `rvlry.content.trivia` and a single localStorage replacement; it is not evidence of native durability and is not a multi-tab transactional database. No game session keys are touched by content updates.

Trivia saves selected question/answer copies, order, progress, reveal state, optional written answers and manual scores in `trivia.device.v1`. This keeps an in-progress quiz independent of pack replacement. Selection balances available categories without repeating questions. Expiry is rechecked before unshown questions, including on resume; expired unshown questions are excluded without replacement. Already shown questions retain their answer review. Insufficient pools block starting; Kids mode and difficulty are never silently widened. Team answers are optional, up to 500 characters each, and marking is manual. Quiz snapshots stay within the native 1 MiB limit; excessively large content or answers produce an explicit error.

`app.features.v1` stores picker visibility independently of games and content. Turning Trivia off only hides its landing-page card; it does not delete saves or protect the route. New games use the current global Kids mode preference. Question installation and publisher configuration remain separate follow-up work.

## Verification

TypeScript tests cover bundled fallback, isolation, full-byte validation, duplicate rejection, revision/version checks, failed reads/writes, corruption recovery, concurrent installs, native CAS handoff, expiry/kids filtering and streaming size bounds. Native instrumentation covers exact 8 MiB packs, chunk boundaries, transactions and rollback, reopen/recovery, kind/session isolation and bridge validation. `pnpm android:test-device` also runs both snapshot and content recovery phases separately with force-stop between write and read. Real Pixel acceptance remains separate from emulator tests.

## Starter testing bank — 0.35.1

The 30-question pack was newly authored for Joe's testing request, not imported from the historical candidate apps. Questions use Australian English, concise standalone wording and one unambiguous expected answer; numeric or commonly accepted name variants are explicit. Stable facts have no expiry. IDs and normalised question texts are checked for duplicates, and all eight categories are represented. The pack has 15 easy, 11 medium and 4 hard questions; 21 are Kids-suitable.

Every question records the authoritative page used for its answer check and identifies the reviewer as `Codex source check`. This is an AI-assisted source review for a testing bank, not a claim of separate human editorial approval. Difficulty is an estimate for the intended audience; Kids suitability additionally considers familiarity for ages 8–12, rather than only absence of adult themes. Broader editorial ingestion remains roadmap work.
