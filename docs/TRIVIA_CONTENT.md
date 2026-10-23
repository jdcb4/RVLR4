# Trivia content storage

Trivia is always visible on the game picker. It is a cooperative quiz to discuss together, with no teams, Correct/Incorrect self-marking, one shared score and a scrollable question recap. Reveal-after-each mode has no writing; reveal-at-end mode always offers one optional shared answer field per question. Simple mode restricts new quizzes to easy questions and is not a child-suitability filter; the intended app audience is adults. The former default-off Show Trivia setting is retired. No discovered historical question bank has been imported. Version 5 of `src/data/trivia/bundled.json` supplies 600 source-checked questions, preserving all 300 prior records unchanged. The original pack and the expansion strategy, category batches and source-review notes are retained under `content/trivia/`. Future publications must use a higher version.

## Records and publishing

`src/data/triviaSchema.ts` owns the strict schema. Each record has a stable `trivia:<slug>` ID, positive revision, question, answer, acceptable variants, optional explanation, one of eight agreed categories, easy/medium/hard difficulty, historical `kidAppropriate` metadata, review timestamp/reviewer/source URLs and optional source-record reference. The retained child metadata is not used for current selection. Editorial source archives and detailed review history remain separate from the runtime pack. These fields establish a review contract; schema validation cannot establish factual accuracy or substitute for human approval.

IDs and normalised question texts must be unique within a pack. Answer variants must not repeat the primary answer or each other. Unicode, case, accents and punctuation are normalised only for duplicate comparison; displayed spelling is retained. Semantic duplicates still require editorial review. Corrections to an ID present in the selected previous pack must increase its revision. Only IDs explicitly listed in removedIds disappear from new selection; omitted records remain. Tombstones are permanent and IDs must not be recycled.

`expiresAt` is an optional exclusive UTC timestamp, e.g. `2026-12-31T13:00:00.000Z`. Date-only values are rejected to avoid timezone ambiguity. Ingestion must convert an intended local expiry date explicitly. `isTriviaQuestionEligible` combines expiry and difficulty, with Simple mode forcing easy, and must be called before presenting any unshown question, including after resume. It uses device time; the offline app cannot establish trusted network time. Questions with no expiry remain eligible when their difficulty is allowed.

Publish locally after editorial review:

```powershell
pnpm publish:trivia <reviewed-pack.json> <output-directory> <https-base-url/>
```

The command validates the complete pack, refuses empty publications, writes compact `trivia-vN.json` and a matching manifest with its exact byte length and SHA-256. It refuses to overwrite existing output versions and uploads nothing. Keep its output outside committed source (for example under `out/`). This single-pack command is an export utility. The maintained live publishing path is the cumulative ledger builder in [Content updates](CONTENT_UPDATES.md); use it to publish updates without losing earlier additions.

## Download and activation

`src/services/contentPacks/` owns a shared version-1 manifest with at most one `trivia` and one `words` descriptor. Each has an independent positive version, HTTPS URL, byte length and lowercase full-payload SHA-256. Both kinds are now installed additively from Settings in 0.41.0; word-game adapters use installed content after local startup loading.

The live URL, downloader limits, explicit-removal protocol, cumulative publisher and recovery behavior are documented in [Content updates](CONTENT_UPDATES.md). No game data is uploaded. Downloads are manual; gameplay works offline.

Trivia installation verifies exact downloaded bytes, UTF-8, hash, schema, kind/version, duplicate identities and question revisions before writing. It rejects downgrades and unknown installed schema versions. Installation errors leave stored content intact. Load tries validated current, previous, then bundled content and reports fallback warnings to callers. Reads failing altogether block installation rather than treating storage as empty.

## Native durability and isolation

The `RvlryDevice` bridge exposes `readContent` and `installContent`. `rvlry-content.db` stores current/previous pack bodies as ordered BLOB chunks of up to 256 KiB, avoiding Android CursorWindow limits. This database is separate from the 1 MiB game-snapshot database. Transactions use FULL synchronous commit; acknowledgement follows commit. Native code validates size/kind/header/version and exact-current compare-and-swap, and retains only an existing checkpoint chosen by the validating TypeScript layer. Failed or interrupted transactions cannot publish partially installed packs. Maximum size is 8 MiB per pack; the previous slot can hold another 8 MiB.

The browser development adapter uses `rvlry.content.trivia` and a single localStorage replacement; it is not evidence of native durability and is not a multi-tab transactional database. No game session keys are touched by content updates.

Trivia saves selected question/answer copies, order, progress, reveal state, optional end-mode shared answers and nullable boolean marks in `trivia.device.v3`, with `schemaVersion: 3`. This keeps an in-progress quiz independent of catalogue updates. Earlier version-1 and version-2 sessions are not loaded or migrated; upgrading to 0.37.0 starts a fresh Trivia quiz under the prerelease compatibility policy. Other games and content packs keep their own keys.

In 0.38.0, setup is a temporary draft until Start quiz commits the selected questions. Reset removes the quiz snapshot; valid older setup-only snapshots are cleaned up without a resume chooser, and failed removal is retryable. Completed score and recap remain saved until reset. The session schema, existing active quizzes and content pack version are unchanged.

Setup uses headings above its option groups, 10/20/30-question presets and eight category toggle buttons plus Select all/Clear all in a three-column grid. Start quiz stays in the fixed footer. Eligibility still uses the same filters, but setup shows no available-question count. Insufficient content displays “Not enough questions match these settings. Choose fewer questions or broaden your selection.” No selected categories displays “Choose at least one category.” Both disable starting. Correct/Incorrect marks use separate green/red states rather than the primary action colour.

Selection balances available categories without repeating questions. The visible Easy, Medium and Hard buttons select an easy-only pool, a 50:50 easy/medium mix, or an equal easy/medium/hard mix respectively. Where stock permits, tier counts differ by at most one; ties are random. Hard is the new default; legacy `all` settings mean Hard. Simple mode overrides the chosen difficulty to easy for a new quiz, while leaving categories intact. Shortages are filled only from allowed tiers, without widening categories or the easy-only Simple constraint. Insufficient eligible pools block starting. Expiry is rechecked before unshown questions, including on resume; expired unshown questions are excluded without replacement. Already shown questions retain their answer review. Shared written answers are optional in end reveal mode, up to 500 characters each, and lock when their answer is revealed. Reveal-after-each mode has no answer writing. On end-mode reveal, trim leading/trailing whitespace, lowercase and collapse internal whitespace for both the written answer and canonical answer/acceptable aliases. An exact match sets the mark to Correct; otherwise the mark stays unset for manual review. Punctuation and other wording differences are not matched automatically. Correct/Incorrect choices allow overrides, and a revealed question must have a mark before Next or Finish quiz. The completion score and scrollable recap omit expired unshown questions. Quiz snapshots stay within the native 1 MiB limit; excessively large content or answers produce an explicit error.

The picker always includes Trivia; `app.features.v1` is no longer read or written. New quizzes read the durable global Simple preference from `app.content.v2`; selected question copies and the captured quiz setting remain independent of later preference/content changes. Old Kids preferences are not imported into Simple mode. Manual publication/installation follows [Content updates](CONTENT_UPDATES.md).

## Verification

TypeScript tests cover bundled fallback, isolation, full-byte validation, duplicate rejection, revision/version checks, failed reads/writes, corruption recovery, concurrent installs, native CAS handoff, expiry/Simple filtering and streaming size bounds. Native instrumentation covers exact 8 MiB packs, chunk boundaries, transactions and rollback, reopen/recovery, kind/session isolation and bridge validation. `pnpm android:test-device` also runs both snapshot and content recovery phases separately with force-stop between write and read. Real Pixel acceptance remains separate from emulator tests.

## Historical bank reviews

The following entries describe the original review criteria and tests at each release. Historical Kids flags remain metadata; the current adult app uses easy-only Simple selection.

### Starter testing bank — 0.35.1

The 30-question pack was newly authored for Joe's testing request, not imported from the historical candidate apps. Questions use Australian English, concise standalone wording and one unambiguous expected answer; numeric or commonly accepted name variants are explicit. Stable facts have no expiry. IDs and normalised question texts are checked for duplicates, and all eight categories are represented. The pack has 15 easy, 11 medium and 4 hard questions; 21 are Kids-suitable.

Every question records the authoritative page used for its answer check and identifies the reviewer as `Codex source check`. This is an AI-assisted source review for a testing bank, not a claim of separate human editorial approval. Difficulty is an estimate for the intended audience; Kids suitability additionally considers familiarity for ages 8–12, rather than only absence of adult themes. Broader editorial ingestion remains roadmap work.

### Expanded testing bank — 0.39.0

The strategy in `content/trivia/STRATEGY.md` was established before generation. Separate category subject plans guide 120 additions, with five easy, five medium and five hard per category. Every addition records a supporting source checked by an AI-assisted reviewer. Difficulty and ages 8–12 familiarity are editorial estimates. Run `pnpm audit:trivia` to validate the pack, preserve the original 30 unchanged, check formatting and flag shared answers or similar questions for semantic review. Shared numeric answers are allowed when underlying facts differ. This audit cannot prove factual accuracy or detect every semantic duplicate.

The bundled version increases independently to 3; existing quiz snapshots keep their selected question copies. Downloaded packs must have a newer version. No publisher endpoint or live generation is introduced. Trivia play and marking controls are 64px tall.

### Second expansion — 0.39.1

Pack 4 adds 150 questions: 50 easy, 50 medium and 50 hard. Six categories gain 19 records each, with Music and Sport & games gaining 18 each. The pre-draft allocation, subject checklists, accepted JSON batches and supporting source evidence are retained in `content/trivia/expansion-v4/`. Review applies the established Australian-audience, ages 8–12, spelling, alias and duplicate conventions. The audit now verifies all 150 prior records, including the separately archived original 30. No game rules, UI, saved-session format or update endpoint change. Existing quizzes keep their selected copies; start a new quiz to access the additions.

### Third expansion — 0.40.0

Pack 5 adds 300 questions: 100 easy, 100 medium and 100 hard. Every category gains 37 or 38 records. The pre-draft allocation, varied subject checklists, accepted JSON batches and opened-source evidence are retained in `content/trivia/expansion-v5/`. The coordinator reads each new question and resolves union audit flags; shared numbers, colours or aliases are retained only for distinct facts. At least eight additions per category target child-familiar easy material, with further familiar entries for ages 8–12.

The repeatable audit now verifies all 300 prior records unchanged. Tests preserve each historical batch and exercise balanced adult quizzes and full Kids quizzes. New quizzes use pack 5; existing saved quizzes keep their selected copies. No historical candidate bank, live generation, publisher endpoint, game-rule or session-schema change is introduced.
