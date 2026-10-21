# Roadmap

Future ideas only. Roadmap entries are **not** action items.

Do not implement anything from this list unless the user explicitly asks for that feature or moves it into an active plan.

When the user mentions a future idea that is out of scope for the current task, add it here rather than implementing it opportunistically.

## Android game ideas — requested 21 October 2026

Deferred; not part of the current implementation:

- **When category:** years/dates associated with significant historical events or famous days.
- **Difficulty modes:** selectable challenge levels. Catalogue entries now carry easy/medium/hard adult-recognition metadata; selection UI remains deferred.
- **Kids mode:** age-appropriate play and content. Catalogue entries now carry an independent ages 8–12 suitability flag; selection UI remains deferred.
- **Game-like graphics:** further bespoke illustrations and game artwork beyond the five selectable visual themes shipped in 0.29.0.

## Trivia game — requested 22 October 2026

Deferred; roadmap only, not approved for implementation.

- **Format:** one presenter reads questions to the group; no pass-and-play handoffs.
- **Question bank:** maintain a reusable bank of trivia questions and answers. Let the presenter choose how many questions to select for a session.
- **Time-sensitive questions:** include an optional expiry date in the question schema. Questions with an expiry date must only be presented while current; exclude expired questions. Questions without an expiry date remain eligible.
- **Answer timing:** choose to reveal answers after each question or together at the end.
- **Open decision:** whether participants write answers in the app or simply remember them.
- **Categories:** choose a balanced set appropriate for the audience during planning. Initial candidates: general knowledge, history, geography, science and nature, arts and literature, film and television, music, and sport and games.
- **Baseline content — Joe:** find the old trivia app he made so its questions can be reviewed and reused as the starting bank.

## Android delivery follow-ups

- Configure and implement validated, atomic word-pack updates from a fixed endpoint, with bundled offline fallback.
- Establish a backed-up release signing identity before broader friend distribution.
