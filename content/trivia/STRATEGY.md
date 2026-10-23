# Trivia editorial strategy

Established for pack 3. The conventions below continue to apply; pack 4 allocation and preservation scope are recorded in [expansion-v4/PLAN.md](expansion-v4/PLAN.md). New batches must exclude facts from the entire current bank, not just the original 30.

## Audience and coverage

Educated Australian adults playing a cooperative newspaper-style quiz, with a genuinely familiar subset for ages 8–12. Global topics are welcome; avoid niche US sports/celebrities, specialist terminology, trick questions and contested superlatives. Hard means a satisfying less-obvious fact about a broadly recognisable subject, not specialist minutiae.

Expansion target: preserve the original 30 records, add 15 per existing category (five easy, five medium, five hard), for 150 total. Each category batch must contain at least four easy entries aimed at children, plus at least one further kids-familiar entry. No quota justifies marking an unfamiliar adult fact kids-suitable. Difficulty remains an editorial estimate, not a calibrated measurement.

## Conventions established before generation

- Australian English, NFC Unicode, trimmed text and single internal spaces. Questions are standalone, usually under 180 characters, and end in a question mark.
- Ask for one answer. Scope places, dates, versions and rules when needed. Avoid current office-holders, changing records, rankings, ambiguous firsts and perishable facts in this batch. Stable facts omit expiresAt; future time-sensitive questions require an exclusive UTC expiry.
- People use their commonly recognised full credited name in the canonical answer. Accept an unambiguous surname/common shortened name as an explicit alias when appropriate. Places use a familiar English name; official/local alternatives go in aliases rather than duplicate entries.
- Canonical titles retain standard capitalisation. Numbers normally use words with a digit alias; units are specified by the question. Do not add aliases differing only by case, accents or punctuation, since schema duplicate comparison already normalises those.
- Do not add distractor lists, compound questions, answer leaks or arbitrary precision. Explanations, when useful, are one short factual sentence.
- Stable descriptive IDs use trivia:<subject>-<fact>; new records revision 1. Preserve the original 30 unchanged in original-pack-v2.json and in the bundle.

## Diversity before drafting

Each worker first creates a 15-slot subject checklist for each assigned category, using distinct subtopics. Exclude every original question and answer from candidate planning. Spread history by period/region, geography by region/type, science by discipline, culture by medium/era, and sport across sports and tabletop games. Avoid relying on capital-city, biggest/smallest, author-of-famous-book and celebrity-birthplace templates. At most two entries about one named entity/franchise; prefer distinct canonical answers. Assign category ownership to avoid overlapping batches.

## Source and review gate

Write original question wording from facts; do not copy trivia collections. Check every expected answer against an opened authoritative source (official institutions, museums, scientific agencies, governing bodies, publishers or creators preferred). Record the actual supporting URL and check timestamp. Never label an unvisited URL as reviewed. Reject unsupported or ambiguous candidates rather than filling quotas blindly. Review metadata says Codex source check: AI-assisted checking, not independent human approval.

## Cleansing and duplicate gate

1. Parse all records with the runtime Zod schema; check IDs and normalised question identity against all batches and the original archive.
2. Flag normalised repeated canonical answers and overlapping question-token pairs for editorial inspection. Reworded duplicates and inverse questions about the same underlying fact count as duplicates even when text differs. Numeric/common answers alone are not proof of duplication.
3. Coordinator reviews every question for clarity, audience, difficulty, aliases, factual support and repeated fact/subject. Resolve all reported pairs before integration.
4. Save candidate subject plans and source evidence with the editorial batches; ship only accepted runtime records. Increment pack version, preserve existing IDs/revisions, and test coverage, Kids eligibility and balanced 10/20/30-question draws.

The audit is repeatable; semantic judgement and source quality are not established by schema or string similarity alone.

Pack 5 uses the allocation and pre-draft checklists in `expansion-v5/PLAN.md`: 300 additions, preserving the entire previous bank. Established editorial conventions remain in force.
