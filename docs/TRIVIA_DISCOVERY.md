# Trivia discovery and decisions — 22 October 2026

Joe approved the separate-corpus storage approach and implementation on 22 October 2026. The storage foundation is implemented in 0.33.0; see [TRIVIA_CONTENT.md](TRIVIA_CONTENT.md). No candidate questions have been approved or imported, and default-off Trivia gameplay is implemented in 0.35.0.

## Confirmed first-version direction

- One presenter uses the phone. Written answers are optional and users self-mark; include a manual scoreboard. Joe confirmed optional written answers inside the app. No automatic marking.
- Select 10, 20, 30 or a custom number of questions from a reviewed offline bank, with balanced selected categories and no within-quiz duplicates. No runtime AI generation.
- Reveal answers after each question or together at the end. Save question order, progress and reveal state across interruptions.
- Confirmed categories: General Knowledge; History; Geography; Science & Nature; Arts & Literature; Film & TV; Music; Sport & Games.
- Content records should carry stable IDs, question, answer/acceptable variants, category, difficulty, kids suitability, provenance/review information and optional expiry. Expired questions must not be presented, including after a resume. Exact expiry handling belongs in the later detailed plan.
- Ingestion should preserve source records, normalise formats, deduplicate, verify facts, assess audience/expiry, review and publish a versioned offline pack. Existing ACTIVE/status flags are not proof of approval. Global Kids mode should apply to the reviewed Trivia pool.

Joe confirmed question-count/reveal choices, categories and the reviewed offline approach. Live question generation may be considered later, not for this version. Storage and game flow are implemented; reviewed content ingestion remains separate work.

## Approved corpus storage direction

Keep Trivia in its own question catalogue and independently versioned update pack, separate from the shared Who What Where/Hat/Imposter word catalogue. Use structured JSON for maintained sources and downloadable packs. Bundle an initial reviewed pack in the APK; install downloaded packs into dedicated native content tables, separate from saved-game snapshots. Do not put the whole corpus into the snapshot store's bounded session envelopes.

Share one update workflow and manifest across word and Trivia packs, while retaining separate schemas, content versions and validation. The manifest can advertise newer versions of either pack independently. Prefer complete replacement packs initially: download, validate schema/checksum/unique IDs, then atomically activate; retain the last valid pack and offline bundled fallback on failure. No live server is needed to play.

Use stable question IDs plus revisions so corrections and removals can be tracked without creating duplicates. Keep provenance/review history in the editorial source. A quiz saves its selected questions/answers and progress independently of pack replacement; expiry checks still apply before presenting an unshown question. The catalogue schema, shared manifest/download validation, separate native content database, replacement/recovery service and publishing command are implemented. The bundled Trivia pack is deliberately empty pending editorial review; no download endpoint is configured. Independent session snapshots and gameplay are implemented in 0.35.0.

## Source findings

| Source | Verified finding | Ingestion relevance |
| --- | --- | --- |
| [TriviaManager](https://github.com/jdcb4/TriviaManager), HEAD `eecee9216ce2ff9c5ef9e9da76f9509087eaa322` | No committed question database or export at audited HEAD. The README's 1,482 example count is not a measured bank size. | Supports questions, answer variants, difficulty, category, staging and exports. Useful concepts, not a populated source we can copy from Git. |
| `C:/CodingProjects/QuickQuiz/data/trivia_questions.json` | 365 entries, 363 distinct exact question texts; no blank question/answer fields. Easy 109, medium 191, hard 65. | Readable candidate seed bank with text, scalar answer, points, category and subcategory. No per-item verification, review, age suitability, expiry or source citations. |
| `C:/CodingProjects/QuickQuiz-question-generation-redesign/data/trivia_questions.json` | Byte-identical to the QuickQuiz file. | Count once, not a second bank. |
| `C:/CodingProjects/TriviaNightCreator/packages/db/src/create-demo-quiz.ts` | 50 demo questions: 34 standard, 11 multiple-choice and 5 multipoint. Separate repository from TriviaManager. | Useful examples of question types; a testing fixture, not approved content. |

QuickQuiz has ten categories with uneven counts (Science alone has 102). Map Movies/Entertainment, Science/Nature, Sports & Games and The Arts into the agreed taxonomy. Review repeated question text contextually rather than deleting blindly. Scalar multipoint answers need interpretation; multiple-choice distractors are generally absent.

TriviaManager's public exports omit provenance/review metadata. Missing cached downloads can be regenerated from current data, and its checksum covers only ID/text/answers, not the entire payload. A future ingestion process should preserve full provenance separately and generate its own immutable, full-payload-verified package. Do not rely on historical seed status as human review.

The repository's migration script includes an embedded connection credential. It was not used and is not reproduced here; do not execute or copy that script into RVLRY. Credential removal/rotation is separate owner work.

## Docker evidence and limits

- Local Docker Desktop's `desktop-linux` engine pipe was unavailable during this read-only audit. No daemon/container was started, restored, mounted or modified. Current live-volume presence and question counts could not be queried.
- The 20 October inventory records `triviamanager_postgres_data` (created 14 March, 48,040,251 bytes, no attached container) separately from `trivianightcreator_pgdata` (created 21 May, 48,183,030 bytes, attached to `trivia-postgres`). These are not interchangeable banks.
- The preserved archive at `C:/Users/joedo/Documents/Codex/2026-09-07/i-x20/work/docker-compact/backup/volumes-and-container-data.tar.gz` exists. Its member list includes the old TriviaManager cluster and database directory `base/16384`; a read-only `PG_VERSION` extraction reports PostgreSQL 16. This establishes a retained database cluster, not that it contains trivia rows. TriviaNightCreator uses PostgreSQL 15.
- Current JMKtec and Tower container/volume-name inventories had no Trivia/Quiz matches. This is a scoped name search, not proof that no shared database contains such data.
- If pursued, inspect the old source read-only when Docker is available. If recovery is necessary, restore an isolated copy using the matching PostgreSQL version; never repurpose the newer application's live volume.

Sanitised host evidence is maintained in the persistent Homelab storage reference. Source checkout and audit notes under `.tmp/trivia-source-review` and `.tmp/trivia-source-findings.md` are research scratch, retained pending the ingestion decision; they are not runtime/build dependencies and can be removed after the source is selected. No credentials or raw database export are included in this project document.
