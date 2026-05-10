# Screen map — JDPassNPlay

Informal names for each player-facing screen so UX discussions and tickets can point at the same thing.  
Implementation hints refer to components under `src/features/` unless noted.

---

## Hub (`/`)

| Name | Description |
|------|-------------|
| **Game picker (home)** | Lists Who What Where, Hat Game, Imposter cards; entry to each game route. Component: `HomePage`. |

---

## Who What Where (`/games/whowhatwhere`)

Rendered inside **`GameShell`**. Flow is driven by `useGameController`: **`landing`** first (with optional **`pendingMatch`** resume card), then setup vs live **`match`**.

| Name | Description |
|------|-------------|
| **Landing** | Game description; if **`pendingMatch`**, a **`ResumeGameCard`** with **Resume game** in-card and **Start new game** in the footer (plus discard confirm when replacing a save). Component: `WwwLandingScreen`. |
| **Game settings** | Team count, turn length, rounds, skips, word categories. Component: `SettingsScreen`. |
| **Team roster (per team)** | One step per team: name team and players (`teamStep` advances through teams). Primary advance (**Next team** / **Finalise teams**) is in the shell footer. Component: `TeamSetupScreen`. |
| **Review teams** | Read-only roster recap plus **Next steps** card before the round starts; **Edit teams** / **Start the game** in the footer. Component: `WwwReviewTeamsScreen`. |
| **Between turns (ready)** | Heading, last-turn recap (`LastTurnCard`), round strip (`ReadyProgressCard`), scoreboard (highlights team that just played), **Next steps** card; footer **`[Describer] Ready`** → **Start turn** (`readyHandoffRevealed`). Component: `ReadyScreen`. |
| **Active turn** | Current word, timer/metrics, Skip/Correct, skipped-word queue; **End turn** in header. Component: `ActiveTurnScreen`. |
| **Final turn recap** | Like **Between turns (ready)** but no following turn: **That’s the last turn** banner, **`LastTurnCard`** recap only, **Next steps** toward overall scores; footer **Final scores**. Match **`stage === "finalSummary"`**. Component: **`FinalTurnRecapScreen`**. |
| **Final results** | Shared layout: winner/tie **hero**, **Final Leaderboard**, **Best turn**, confetti; footer **Pick another game** / **Replay** / **New game**. Component: **`ResultsScreen`**. |

---

## Hat Game (`/games/hat`)

Rendered inside **`GameShell`**. Shell step is **`AppSnapshot.step`** (`hatGameAppTypes`). When step is **`game`**, **`HatGameSession.stage`** selects the in-play screen.

| Name | Description |
|------|-------------|
| **Landing** | Game description; if a save exists, **`ResumeGameCard`** + footer **Start new game** (discard confirm when replacing). |
| **Game settings** | Team count, turn length, skips per turn (aligned with WWW settings chrome). |
| **Team roster (per team)** | Name team and players for the current team (`teamEditIndex`). Primary advance is in the shell footer. Uses `TeamRosterSetupScreen` inside **`GamePanel`**. |
| **Review teams** | **`ReviewTeamsPanel`** summary plus **Next steps** card for private clue entry; **Edit teams** / **Start famous figure entry** in the footer. |
| **Clue entry — private handoff** | “Pass to …” / only that player should see the screen (`clueEntryRevealed === false`). |
| **Clue entry — figures form** | Enter famous figures for the active player (`clueEntryRevealed === true`). |
| **Loading saved game** | Brief placeholder while persisted state loads (`!controller.loaded`). |
| **Between turns (ready)** | Heading, **`HatLastTurnCard`**, phase strip (**`ReadyProgressCard`**), scoreboard (highlights team that just played), **Next steps** card; **`[Describer] Ready`** → **Start turn**. Session **`stage === "ready"`**. |
| **Active turn** | Current clue, timer and phase metrics, Skip/Correct, optional skipped-clue rows. Session **`stage === "turn"`**. |
| **Final turn recap** | Last turn of the match: **That’s the last turn**, **`HatLastTurnCard`**, **Next steps**; footer **Final scores** → **`stage === "results"`**. Session **`stage === "finalSummary"`**. |
| **Final results** | Same shared podium UI as WWW (**`FinalResultsBody`** via **`mapFinalResultsFromHat`**); session **`stage === "results"`**. |

Screen assembly: **`buildHatGameScreen`** in `HatGameWebScreens.tsx` routes **`AppSnapshot.step`** and delegates to modules under **`features/hat-game/screens/`** (same file-per-screen idea as Who What Where). **`HatGameApp`** adds shell chrome, error strip, and **`AppInfoOverlay`**.

---

## Imposter (`/games/imposter`)

Rendered inside **`GameShell`**. Flow is driven by **`ImposterSnapshot.step`** (`imposterAppTypes`). Winner/final-guess rules stay at the table — the app only orchestrates timing and reveals.

| Name | Description |
|------|-------------|
| **Landing** | Game description; optional **`ResumeGameCard`** + footer **Start new game** (discard confirm). Component: `imposterLandingScreen`. |
| **Loading saved game** | Brief placeholder while persisted state loads (`!controller.loaded`). Component: `imposterLoadingScreen`. |
| **Game settings** | Player count (4–10) and imposter count (clamped + defaulted). Component: `imposterSettingsScreen`. |
| **Player roster** | Flat list of editable names (`EditableName`). Footer **Back** / **Next: Review**. Component: `imposterRosterScreen`. |
| **Review players** | Read-only list + **Start round** (deals roles and word from app JSON). Component: `imposterReviewScreen`. |
| **Reveal — pass** | “Pass to …” handoff (`revealRevealed === false`). Mirrors Hat clue-entry handoff. Component: `imposterRevealScreen`. |
| **Reveal — role / word** | Regular players see the secret word; imposters see fixed copy. Footer **Confirm and pass on** through the roster. Component: `imposterRevealScreen`. |
| **Round guide — pregame** | Two circles of clues; footer **Ready for discussion**. Component: `imposterRoundGuidePregameScreen`. |
| **Round guide — pre-discussion** | Discuss and vote at the table; footer **Vote done**. Component: `imposterRoundGuidePreDiscussionScreen`. |
| **Round guide — reveal warning** | Confirm group is ready for spoilers; footer **Reveal**. Component: `imposterRoundGuideRevealWarningScreen`. |
| **Round reveal / results** | Shows imposter name(s) + secret word from stored round; footer **`GameResultActions`** (Pick another / Replay / New game). Component: `imposterResultsScreen`. |

Screen assembly: **`buildImposterScreen`** in `ImposterWebScreens.tsx`. **`ImposterApp`** adds shell chrome, error strip, and **`AppInfoOverlay`**.

---

## Overlays (not routes)

| Name | Description |
|------|-------------|
| **App info** | Small dialog: product name, version, credit. **`AppInfoOverlay`** — opened from the header **i** control on Hat Game, Who What Where, and Imposter. |

---

## Dev-only

| Name | Description |
|------|-------------|
| **UI gallery** | Side-by-side previews of Hat Game and Who What Where (`pnpm run ui-gallery`, `gallery.html`). Not part of the default production bundle. |

---

## Cross-game shorthand

These labels align across both games:

- **Settings** — global rules before play.
- **Team roster** — naming teams/players.
- **Review teams** — final roster check before play or clue entry (both games).
- **Ready / between turns** — pass-the-phone moment before a timed turn.
- **Active turn** — timed describing/guessing with Skip/Correct (WWW: header End turn; Hat: footer actions).
- **Final turn recap** — last turn’s performance before the leaderboard (both games).
- **Results** — shared podium (winner hero, **Final Leaderboard**, **Best turn**, confetti); replay / exit actions.

Who What Where adds **Landing** with optional resume, **Final turn recap**, and category-driven setup. Hat Game adds **Landing**, **Clue entry**, phase-based turns, **Final turn recap**, and the shared ready → turn → recap → results flow. Imposter adds **Landing**, flat roster, pass-and-play **Reveal**, and a short **Round guide** chain ending in a scripted **word + imposter** reveal (no scoreboard).
