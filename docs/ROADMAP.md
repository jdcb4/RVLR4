# Roadmap

Future ideas only. Roadmap entries are **not** action items.

Do not implement anything from this list unless the user explicitly asks for that feature or moves it into an active plan.

When the user mentions a future idea that is out of scope for the current task, add it here rather than implementing it opportunistically.

## Android game ideas — requested 21 October 2026

Deferred; not part of the current implementation:

- **When category:** years/dates associated with significant historical events or famous days.


## Trivia game — requested 22 October 2026

Storage approach approved and foundation implemented in 0.33.0. Gameplay and reviewed content ingestion are next. See [Trivia discovery](TRIVIA_DISCOVERY.md).

- **Format:** one presenter reads questions to the group; no pass-and-play handoffs.
- **Question bank:** maintain a reusable bank of trivia questions and answers. Let the presenter choose how many questions to select for a session.
- **Time-sensitive questions:** include an optional expiry date in the question schema. Questions with an expiry date must only be presented while current; exclude expired questions. Questions without an expiry date remain eligible.
- **Answer timing:** choose to reveal answers after each question or together at the end.
- **Answers and scoring:** optional written answers, self-marking and a manual scoreboard. Writing location (paper or in-app) still needs clarification during flow design.
- **Categories:** confirmed general knowledge, history, geography, science and nature, arts and literature, film and television, music, and sport and games.
- **Corpus updates:** separate Trivia storage, independent versions and shared manifest/download validation implemented; reviewed initial content, publisher endpoint and Settings/game integration remain. See [Trivia content](TRIVIA_CONTENT.md).
- **Live question generation:** possible future extension; excluded from the first version.
- **Baseline content:** TriviaManager repo inspected; local QuickQuiz has 365 candidate entries and TriviaNightCreator has 50 demo questions. Historical Docker volumes and a preserved old cluster backup were identified; live contents remain unverified while Docker is stopped. These are ingestion candidates only, not approved questions.

## Android delivery follow-ups

- Configure and implement validated, atomic word-pack updates from a fixed endpoint, with bundled offline fallback.
- Establish a backed-up release signing identity before broader friend distribution.
