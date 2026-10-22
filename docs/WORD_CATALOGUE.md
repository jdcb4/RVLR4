# Word catalogue conventions

Established before the October 2026 expansion. These rules apply to original annotations and new entries.

## Audience and selection

Target broadly educated Australian adults, with a mix of international and Australian culture, everyday life, science, nature, geography, arts, history and sport. Do not equate education with specialist trivia. New sports names should have broad recognition; avoid padding with niche US leagues, local politicians or obscure celebrities. Prefer durable recognition over short-lived internet trends. The original source lists are retained verbatim, including their historical selection biases.

Kids suitability means a plausible playable answer for ages **8–12**, not merely an inoffensive word. Use a separate `kidAppropriate` boolean: no adult-only sexual, drug/alcohol or graphic-violence themes; familiar objects, animals, places and age-appropriate characters are encouraged. Adult recognition difficulty and child suitability are independent. A false flag can mean unfamiliarity, not objectionable content. These are editorial judgements, not parental guarantees.

The targeted children's supplement uses `kidTargeted: true` for answers deliberately selected around children's interests and experiences, rather than adult general knowledge that happens to be suitable. Target ages remain 8–12. Prioritise playful, readily describable school/play experiences, familiar stories and games, creatures and imaginative adventures. Avoid merely adding obscure children's authors, minor characters or modifiers to existing answers. Hints use short, concrete language a child can understand. Every targeted entry must also be `kidAppropriate: true`; older entries default to non-targeted until individually curated. Adult difficulty remains independent.

## Display and identity

- Australian English and Unicode NFC; trim whitespace and use single internal spaces.
- Sentence case for common nouns; conventional capitals for people, places, characters, brands and titled works. Preserve meaningful accents and punctuation.
- Common-noun answers omit introductory “a”/“an”. Articles and “toy”, “homemade” or “backyard” modifiers must not be used to disguise duplicates of existing answers.
- People: commonly recognised full public name, or established stage/pen name. No unnecessary honorifics, possessives or actor-plus-character combinations. Distinct fictional characters and their actors are separate answers.
- Monarchs: conventional name and ordinal, with country only when needed. Characters: familiar name plus a short parenthetical work qualifier only for genuine ambiguity.
- Places: common contemporary English name; use a short country/region qualifier for ambiguous places. Indigenous names may be primary where commonly used (for example Uluru). Historical/alternative official names are aliases, not extra cards. Do not combine names using slash-separated alternatives.
- Synonyms, nicknames, alternate spellings and old official names for the same referent are `aliases`. Keep only one canonical answer per game. A group and an individual member are different answers; a general type and a specific example are different answers.
- Identity comparison ignores case, accents, punctuation and spacing. Explicit alias review catches semantic duplicates that normalisation cannot. Homonyms with genuinely distinct referents must be qualified.
- An ambiguous original such as Oasis can resolve to separate qualified answers (the band and the desert feature). Preserve each source ID on its actual referent; do not register the ambiguous unqualified name as an alias on both records. Provenance checks allow a disambiguating parenthetical qualifier.
- Sharing one catalogue answer between games is intentional reuse, not two copies within a game's draw pool.
- Display names at most 80 characters; WWW hints at most 240 characters. Hints should be concise, factual, helpful and should not just repeat the answer. Avoid time-sensitive claims such as current office holder.

## Difficulty

Every canonical entry, including entries inherited from the original lists, has exactly one rating:

- `easy`: widely recognisable everyday vocabulary or very prominent people/places/characters; usually readily described.
- `medium`: familiar general culture, school knowledge or a well-known field; may require a useful clue.
- `hard`: less widely recognised or more specialised, but still a meaningful playable answer. Hard does not justify adding random obscurities.

Ratings are editorial estimates for the adult audience, not measured success rates. The existing gameplay `difficultyMode` is a legacy rule setting and is not this metadata. WWW and Imposter expose `wordDifficulty`: All keeps every rating, while Easy, Medium and Hard each select that exact rating. App-wide Kids mode intersects this selection with `kidAppropriate`, not only `kidTargeted`. Hat automatic suggestions also honour Kids mode; manually entered clues are unchanged. Empty intersections show an error, never an unfiltered fallback. Imposter currently has no Hard kids-suitable entries.

## Provenance and maintenance

The three existing JSON lists remain immutable original snapshots. Each catalogue record references zero-based source IDs (`www:INDEX`, `hat:INDEX`, `imposter:INDEX`) for every inherited entry it represents. New-only records have an empty `originalIds` array. Merged original aliases retain all source IDs, so the exact old display/hint can be recovered. Source hashes and coverage tests protect the snapshots.

Catalogue records contain `word`, `category` (Who/What/Where), `hint`, `difficulty`, `kidAppropriate`, `kidTargeted` (defaults to false), `aliases`, `originalIds`, and `games` (www/hat/imposter). Category describes the answer, even for games without category controls. Every record is unique globally after canonical/alias review. Original snapshot duplication is archival, not part of the playable pool.

Automated checks must validate all fields, resolve every original source ID exactly once, reject normalised name/alias collisions, and verify the three runtime projections. Game adapters strip catalogue metadata before constructing existing saved game values; expanding the bundle must never redeal or migrate an in-progress game.

## Files and review

The October 2026 catalogue contains **4,797 canonical answers**: 3,804 inherited records representing all 4,159 original source entries, plus **993 new answers**. Cross-game reuse and alternate-name merges explain the difference between source and canonical counts. There are 1,638 kids-appropriate answers overall, including **557 additions**. Ratings total 1,791 easy, 2,232 medium and 774 hard.

| Game | Original pool | Expanded playable pool |
| --- | ---: | ---: |
| Who What Where | 3,129 | 3,994 |
| Hat Game | 1,018 | 1,214 |
| Imposter | 12 | 279 |

The expansion was assisted by three GPT-6-Luna high-reasoning agents, followed by coordinator review of aliases, homonyms, child recognition, stale hints and rating calibration. No external Gemini/OpenRouter API calls were needed. The original deep-trivia selections remain available and rated; the new selection emphasises breadth rather than further specialist padding.

Version 0.31.1 adds a separate **123-answer children-first pass** (23 Who, 81 What, 19 Where), assisted by a Luna high-reasoning agent and reviewed for age fit and semantic duplication. All 123 have `kidTargeted: true`, join WWW, and include 23 Hat suggestions and 47 Imposter prompts. Unlike broad suitability tagging, these were selected around children's play, imagination, school and familiar entertainment. Generation scratch in `.tmp/kids-targeted` is retained for content review only; it can be removed after acceptance and is not required by builds or runtime.

- `src/data/whoWhatWhereWords.json`, `hatClueSuggestions.json`, `imposterWords.json`: untouched original snapshots. Source IDs use the zero-based position in these arrays.
- `src/data/catalogue/{who,what,where}.json`: maintained canonical records. An empty `originalIds` array identifies an addition; otherwise the record descends from the original list, including merged originals.
- `src/data/catalogue/kids.json`: the dedicated children-first supplement. Each answer is new, child-targeted and checked against the existing names and aliases. It shares the same schema and game adapters.
- `src/data/catalogueSchema.ts`: strict field, identity and provenance uniqueness validation.
- `pnpm export:words`: validate and export all records to `out/RVLRY-word-catalogue.csv`, including original/new status, ratings, aliases, source IDs and the targeted-child-selection flag. Also writes `out/RVLRY-kids-targeted.csv` containing only the targeted selection. No network access is required.
- `src/data/wordCatalogue.test.ts`: original semantic-content SHA-256 checks (JSON serialisation, independent of whitespace/line endings), source coverage, duplicate rejection and legacy adapter compatibility.

For a new answer, first search canonical names **and aliases** across all catalogue files. Add game membership to an existing record rather than duplicating it. Preserve original IDs and aliases during corrections. Run `pnpm run verify` after edits. Adding a mode or downloaded pack still requires its own implementation and persistence design.
