# Content and audience review

24 October 2026. This is a bounded AI-assisted release review of the checked-in
catalogue and Trivia pack 5, not a complete human editorial audit or an assigned
IARC rating. No answers, questions or historical source snapshots were deleted.

## Current release direction

Joe requested an adult-oriented app, removal of Kids mode and its ages 8–12
marketing, and a **Simple mode** that restricts automatic selection to easy
content. Simple describes difficulty; it does not promise suitability for
children or filter mature subject matter. Removing a label alone does not
establish an audience declaration: review the final app, store copy, screenshots
and all accessible content together before completing the target-audience and
content-rating questionnaires. Verify the final implemented filter separately.

The previous `kidAppropriate`/`kidTargeted` fields remain content metadata and
historical editorial evidence; they must not be presented as the new active
Simple filter. Easy answers with a false historical Kids flag remain eligible
under an easy-only filter. Source-supported facts and schema validity do not
establish rights clearance, child suitability or human approval.

## Counted source inventory

Counts read directly from `src/data/catalogue/{who,what,where,kids}.json` and
`src/data/trivia/bundled.json`:

| Pool                      | All content | Easy content |
| ------------------------- | ----------: | -----------: |
| Canonical word catalogue  |       4,797 |        1,791 |
| Who What Where            |       3,994 |        1,567 |
| Hat automatic suggestions |       1,214 |          338 |
| Imposter                  |         279 |          258 |
| Trivia questions          |         600 |          205 |

Game memberships overlap. Among easy records, 426 words and seven Trivia
questions have `kidAppropriate: false`; that field can also mean unfamiliarity,
so these counts are not counts of objectionable content. The former filtered
pool contains 1,638 words and 295 questions. Difficulty, category and historical
child-suitability estimates are independent.

## Evidence requiring a publisher decision

| Entry or question                                                              | Accessible content and implication                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bob Hawke (`who.json`)                                                         | Easy; WWW hint includes “Loved beer and sport”. This contradicted the former catalogue rule against alcohol themes in Kids content. Under the requested adult Simple mode it is an ordinary alcohol reference to account for in the questionnaire, not a broken difficulty filter. Hat also suggests the name, without displaying this WWW hint. |
| Champagne (drink), Pub and Winery                                              | Easy references to alcohol or drinking venues; the first is in WWW, the latter two in Imposter. Simple mode does not remove them.                                                                                                                                                                                                                |
| Adolf Hitler, Joseph Stalin and Hiroshima                                      | Easy WWW answers. Hints refer to dictatorship/Nazi Germany and an atomic bombing. Historical references are textual, but remain relevant to the full content assessment.                                                                                                                                                                         |
| Grenade, Missile and Shotgun                                                   | Easy WWW answers; weapon descriptions remain in Simple mode. Cannon, Bow and arrow, Spear and Sword also have easy ratings. These are names/descriptions, not playable shooting mechanics.                                                                                                                                                       |
| The Terminator, James Bond and Wednesday Addams                                | Hat names with no descriptive hint. Their franchise associations deserve semantic audience review; a keyword scan of hints alone would miss this context. The Terminator and Wednesday Addams are medium, James Bond is easy. This is a review prompt, not a classification of the films/series or a decision to delete the characters.          |
| `trivia:anne-frank-diary`                                                      | Easy question refers to hiding from Nazis. Historical persecution context warrants deliberate review; it is not graphic. The word catalogue separately marked Anne Frank as unsuitable for its former Kids pool, showing that historical child flags were not a consistent editorial guarantee.                                                  |
| `trivia:transported-prisoners-term` and `trivia:coco-young-musician`           | Easy questions mention transported prisoners and the Land of the Dead respectively. Educational history and a family-film setting require context, not automatic keyword rejection.                                                                                                                                                              |
| `trivia:nosferatu-1922-vampire-name` and `trivia:pans-labyrinth-war-aftermath` | Non-easy questions reference horror and civil-war settings. They remain accessible when Simple mode is off and must be included in an assessment of the complete app.                                                                                                                                                                            |
| Kiki Smith; Jack the Ripper; Auschwitz/Dachau; Whiskey/Wine                    | Other non-easy catalogue entries include an artist hint mentioning sex, a serial-killer description, concentration-camp descriptions and alcoholic drinks. Adult content is available when Simple is off.                                                                                                                                        |

These examples identify actual text/context for review. They do not imply that
every mention of history, alcohol, a weapon or a mature franchise requires
removal. Keep any editorial correction separate from the immutable archival
source lists. Follow the reviewed content-update ledger for changes to already
published word identities/questions; do not change a publication baseline in
place.

## Audit method and limits

The review counted all records, inspected the former child-filtered answer
names, read matched records and sampled question/context wording. A case-
insensitive whole-word triage of word/name, hint, aliases and question/answer/
explanation fields flagged 16 word records for sexual/alcohol/drug terms and
69 for violence/history/weapon terms; the corresponding Trivia counts were
zero and 20. These are flags, not editorial findings. The former child pool
had one alcohol-term flag (Bob Hawke) and 13 violence/history/weapon flags.

The term groups included sex/sexual/porn/nude/naked, drug and common alcoholic
drink names, plus kill/killer/murder/death/dead/blood/war/weapon/gun/bomb/
atomic/horror/terror/Nazi/Hitler/Holocaust/prison/slavery and common variants.
Word boundaries deliberately produce misses such as plural “Nazis” and
“warfare”; a second substring pass and semantic inspection found those cases.
Substring searches also produce false positives: “heroine” contains “heroin”,
“Grapes” contains “rape”, and scientific “atomic” or “blood” need not describe
violence. Franchise names and child familiarity require judgement beyond
either search method. No complete source-by-source factual recheck, profanity
certification, ownership clearance or human sign-off is claimed.

Hat permits locally entered words, and local player names/optional written
Trivia answers can contain arbitrary user text. Simple mode concerns automatic
content selection and cannot guarantee the wording people enter. Existing
saved games retain selected copies; changes to selection preferences or a new
content pack should not silently rewrite an active game. Review the final
build's settings and resume behaviour before making store promises.
