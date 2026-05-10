# Cross-game UX review — Who What Where vs Hat Game

This document compares player-facing UX **between the two shipped games** (Who What Where and Hat Game): what matches, what diverges, and how shared components are (or could be) structured. It reflects the codebase as of the report date and complements [`SCREENS.md`](SCREENS.md).

---

## 1. Executive summary

Both games share a deliberate **hub-and-flow** pattern: [`GameShell`](../src/components/GameShell.tsx) (home icon, title, scroll body, sticky footer), [`GamePanel`](../src/components/game/GamePanel.tsx) for card chrome, [`PrimaryFooterButton` / `SecondaryFooterButton`](../src/components/game/GameFooterButtons.tsx), and typography/theme tokens (`text-typ-*`, `semantic-*`). **Final results** and much of **between-turns** / **final turn recap** are strongly aligned through shared `components/game/` building blocks.

The largest **structural** difference is runtime shape: WWW uses many focused screen modules under `features/whowhatwhere/`; Hat centralizes almost all UI in [`HatGameWebScreens.tsx`](../src/features/hat-game/HatGameWebScreens.tsx) plus [`HatGameApp.tsx`](../src/features/hat-game/HatGameApp.tsx). Hat also has **exclusive** setup steps (private clue entry). WWW has **richer** word-game settings (categories, rounds, hints) that have no Hat counterpart.

---

## 2. Screen-type comparison matrix

| Screen type (informal) | Who What Where | Hat Game | Parity / notes |
|------------------------|----------------|----------|----------------|
| **Landing** | `WwwLandingScreen` | `renderLanding` | **High** — same `GamePanel` + `ResumeGameCard` + discard copy pattern; different titles/subtitles. |
| **Game settings** | `SettingsScreen` | `renderSettings` | **Medium** — shared `TeamCountOptionGroup`, turn length, skips; **WWW-only**: rounds, categories, difficulty, hints. |
| **Team roster (per team)** | `TeamSetupScreen` | `renderTeamEditor` | **High** — both wrap [`TeamRosterSetupScreen`](../src/components/team-setup/TeamRosterSetupScreen.tsx); same eyebrow/subtitle pattern; footer labels via `teamRosterAdvanceLabel`. |
| **Review teams** | `WwwReviewTeamsScreen` | `renderReview` | **High** — shared [`ReviewTeamsPanel`](../src/components/game/ReviewTeamsPanel.tsx) + [`reviewTeamMappers`](../src/components/game/reviewTeamMappers.ts); **different** next-step copy and primary footer (**Start the game** vs **Start famous figure entry**). |
| **Clue / word prep** | *(none — goes to review → round)* | Clue handoff + clue form | **Hat-only** — pass-and-play private entry; no WWW equivalent. |
| **Between turns (ready)** | `ReadyScreen` | `renderReady` | **High** — shared stack: [`ReadyProgressCard`](../src/components/game/ReadyProgressCard.tsx), [`GameScoreboard`](../src/components/game/GameScoreboard.tsx), [`ReadyNextStepsCard`](../src/components/game/ReadyNextStepsCard.tsx); domain-specific [`LastTurnCard`](../src/features/whowhatwhere/summary/LastTurnCard.tsx) vs [`HatLastTurnCard`](../src/components/game/HatLastTurnCard.tsx) (WWW shows **Round**, Hat **Phase**). |
| **Active turn** | `ActiveTurnScreen` | `renderTurn` | **Medium** — both use [`TurnPlayHighlight`](../src/components/game/TurnPlayHighlight.tsx), [`Metric`](../src/components/Metric.tsx), Skip/Correct footers; **WWW**: word queue, categories, **End turn** in header; **Hat**: phase label in metrics, skipped-clue return rows, **End turn** in header. |
| **Final turn recap** | `FinalTurnRecapScreen` | `renderFinalTurnRecap` | **High** — shared [`ThatsTheLastTurnCard`](../src/components/game/ThatsTheLastTurnCard.tsx), [`ReadyNextStepsCard`](../src/components/game/ReadyNextStepsCard.tsx), domain-specific last-turn cards. |
| **Final results** | `ResultsScreen` | `renderResults` | **Very high** — shared [`FinalResultsBody`](../src/components/game/final-results/FinalResultsBody.tsx) + mappers in [`viewModel.ts`](../src/components/game/final-results/viewModel.ts). |
| **Loading** | *(inline in controller)* | `GamePanel` “Loading saved game…” | **Hat-only** explicit placeholder. |

---

## 3. Commonalities (same screen types)

- **Chrome**: `GameShell`, `GamePanel`, footer button components, `AppInfoOverlay` (both games).
- **Persistence UX**: `ResumeGameCard` + “discard saved game” confirm flow on landing.
- **Roster editing**: `TeamRosterSetupScreen` with `omitHeading` when `GamePanel` supplies headings; shared roster validation patterns in domain setup helpers.
- **Review checkpoint**: read-only team summary via `ReviewTeamsPanel` + per-game row mappers.
- **Ready / recap / results tail**: shared scoreboard component, progress strip card, next-steps card, final recap banner, and full results podium (hero, “Final Leaderboard”, best turn, confetti).
- **Timed turn**: large play highlight, metric grid, primary **Correct** + secondary **Skip**, optional “return skipped” affordances.
- **Typography & color**: `text-typ-*` tiers and `semantic-*` surfaces for panels and highlights.

---

## 4. Differences (same screen types)

| Dimension | Who What Where | Hat Game |
|-----------|----------------|----------|
| **Code organization** | Many small screen files | Single large `HatGameWebScreens` builder |
| **Settings depth** | Word categories, rounds, hint controls | Team count, turn length, skips only |
| **Pre-play path** | Review → **Start the game** → match | Review → **Clue entry** (multi-step) → match |
| **Ready strip** | Round x/y | Phase name + number |
| **Last-turn recap** | Words from word history | Words from clue history; optional phase-complete line inside card |
| **Active turn primary content** | Mystery words + category | Famous-figure clues + phase |
| **Skip return UI** | WWW word chips / queue | Hat outline buttons per skipped clue |
| **Sound / timers** | WWW-specific sound hooks | Hat phase cues + countdown helpers |
| **Footer wiring** | `WhoWhatWhereApp` centralizes modes | `ScreenModel.actions` returned from `buildHatGameScreen` |

---

## 5. Shared UX components (abstracted today)

| Component / area | Location | Role |
|------------------|----------|------|
| `GameShell` | `components/GameShell.tsx` | App frame: header, scroll, footer |
| `GamePanel` | `components/game/GamePanel.tsx` | Card titles/subtitles/eyebrows |
| `GameFooterButtons` | `components/game/GameFooterButtons.tsx` | Footer primaries/secondaries |
| `GameScreenHeaderActions` | `components/game/GameScreenHeaderActions.tsx` | e.g. End turn + info |
| `ResumeGameCard` | `components/game/ResumeGameCard.tsx` | Saved-game resume CTA |
| `TeamRosterSetupScreen` | `components/team-setup/TeamRosterSetupScreen.tsx` | Editable teams/players |
| `teamRosterAdvanceLabel` | `components/team-setup/teamRosterLabels.ts` | Footer label progression |
| `ReviewTeamsPanel` + mappers | `components/game/` | Review grid |
| `TeamCountOptionGroup`, `OptionGroup` | `components/setup/` | Settings chips |
| `Metric` | `components/Metric.tsx` | Turn metrics |
| `TurnPlayHighlight` | `components/game/TurnPlayHighlight.tsx` | Big reveal line |
| `GameScoreboard` | `components/game/GameScoreboard.tsx` | Score list + highlight |
| `ReadyProgressCard`, `ReadyNextStepsCard` | `components/game/` | Between-turns strips |
| `WwwLastTurnCard` / `HatLastTurnCard` | `components/game/` | Last-turn recap bodies |
| `ThatsTheLastTurnCard`, recap copy | `components/game/` | Final-turn recap banner |
| `FinalResultsBody` + blocks + confetti | `components/game/final-results/` | Results podium |
| `GameResultActions` | `components/GameResultActions.tsx` | Post-results triple actions |

---

## 6. Not (fully) abstracted — game-specific or duplicated

| Pattern | WWW | Hat | Note |
|---------|-----|-----|------|
| **Landing screen** | `WwwLandingScreen` | Inline in `renderLanding` | Same UX recipe; two implementations. |
| **Settings body** | `SettingsScreen` | `renderSettings` | Shared controls at leaf level; **no** single `SettingsPanel` wrapper. |
| **Team setup wrapper** | `TeamSetupScreen` | `renderTeamEditor` | Both use `TeamRosterSetupScreen`; outer `GamePanel` duplicated in spirit. |
| **Review + next steps** | `WwwReviewTeamsScreen` | `renderReview` | Two `GamePanel` stacks; copy differs. |
| **Ready screen** | `ReadyScreen` | `renderReady` | Shared pieces; **no** single `BetweenTurnsScreen` component. |
| **Active turn** | `ActiveTurnScreen` | `renderTurn` | Large bespoke layouts; shared atoms only. |
| **Scoreboard adapter** | `Scoreboard` (WWW-specific mapping) | `HatScoreboard` local helper | Both delegate to `GameScoreboard`; thin wrappers could stay or merge into props factories. |
| **Footer orchestration** | `WhoWhatWhereApp` | `buildHatGameScreen` + `HatGameApp` | Different patterns; equivalent outcomes. |

---

## 7. Would further abstraction help?

**Implemented (shared components)**

1. **`BetweenTurnsLayout`** — Slots: `heading`, `lastTurnCard`, `progressCard`, `scoreboard`, `nextSteps`, optional `banner` / `confetti` / `tail`. Used by **`ReadyScreen`**, **`FinalTurnRecapScreen`**, **`hatReadyScreen`**, **`hatFinalTurnRecapScreen`**.

2. **`LandingScreenLayout`** — `title`, `subtitle`, `resumeSlot`, `confirmDestructiveSlot`; optional **`wrapInKeyboardSafeSection`** (WWW `true`, Hat `false`). **`WwwLandingScreen`** and **`hatLandingScreen`** compose it.

**Worth considering (medium value)**

3. **`ActiveTurnShell`** — Shared grid for `TurnPlayHighlight` + `Metric` cluster + instruction row; game-specific slots for queue/skipped panels. **Only** if active-turn UX is expected to stay parallel long-term.

**Lower priority / risk of over-abstraction**

- **Unified `SettingsScreen`**: Hat and WWW settings diverge in **domain** (word categories vs none). A single component would carry many conditional branches; current split is readable.
- **One mega-screen-builder for both games**: Would couple unrelated state machines (`useGameController` vs `useHatGameApp`). Not recommended.

**Already at a good balance**

- **Final results**: Fully shared presentation + view-models — good precedent for other “same UX, different domain” screens.
- **Review teams**: Shared panel + mappers — appropriate boundary.

---

## 8. Recommendations (non-binding)

1. **Keep** domain-specific last-turn and active-turn content in separate modules or slots; **avoid** merging WWW/Hat turn engines.
2. **Between-turns spacing/order** — adjust **`BetweenTurnsLayout`** once to affect WWW ready/recap and Hat ready/recap together.
3. **Document** footer label sources (`WhoWhatWhereApp` vs `ScreenModel.actions`) in [`ARCHITECTURE.md`](ARCHITECTURE.md) if onboarding friction appears — behavior is equivalent but discovery differs.
4. **Hat-only** clue-entry flow remains intentionally separate; treating it as a third “setup track” in docs (already in `SCREENS.md`) is enough unless a second game adds similar private-entry steps.

---

## 9. Related docs

- [`docs/SCREENS.md`](SCREENS.md) — screen naming map  
- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — module boundaries  
- [`docs/THEMING.md`](THEMING.md) / [`docs/TYPOGRAPHY.md`](TYPOGRAPHY.md) — visual system  

---

*Generated as a UX inventory for cross-game parity discussions; update when major flows or shared components change.*
