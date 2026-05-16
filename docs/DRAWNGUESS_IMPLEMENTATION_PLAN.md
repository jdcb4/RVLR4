# DrawNGuess Implementation Plan

DrawNGuess is a proposed fourth multiplayer game for the room-based game set. It is a Telestrations-style game where every player starts with a secret word, then all players act at the same time while packets rotate around the room:

1. Turn 1: each player draws their starting word.
2. Turn 2: each player guesses another player's drawing.
3. Turn 3: each player draws the previous guess.
4. Continue alternating draw and guess turns until each packet has visited every player.
5. Reveal each packet as a chain: original word, drawing, guess, drawing, guess.

The design prototype lives at [`prototypes/drawnguess/index.html`](../prototypes/drawnguess/index.html). It is standalone and is not wired into production routes.

## Product Decisions

- **Player count:** recommend 3-8 players. Three works but is short; 5-8 gives the best chain payoff.
- **Scoring:** no scoring, voting, or awards for v1. The outcome is the reveal gallery and the social presentation of each chain.
- **Starting prompt mode:** default to predetermined server-selected words, with a room setting for custom player-written prompts. In custom mode, the first turn is text entry: each player writes the word or phrase that starts their own packet.
- **Word packs:** build the backend framework around explicit word-pack IDs from the start, even if v1 only ships one default pack. The server should choose words so clients cannot all inspect the deck.
- **Turn timing:** default to 60 seconds for drawing and 30 seconds for guessing, with host-configurable timers later if needed.
- **Avatars:** players get a random avatar by default when entering their name, and can change it before joining.
- **Review pacing:** host-paced reveal is simplest and fits the existing room captain pattern.
- **Drawing fidelity:** v1 can store drawings as compressed canvas data URLs or stroke data in memory. Stroke data is better for syncing and size control.

## Implementation Readiness Pass

The prototype is a UX reference, not production code to port directly. Production DrawNGuess should use the existing multiplayer shell, lobby layout, typography tiers, semantic theme tokens, footer buttons, and room sync patterns first. Add DrawNGuess-specific components only where the interaction is genuinely new.

### Existing Component Reuse Map

| DrawNGuess area             | Existing app piece to reuse                                                                             | Notes                                                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multiplayer game entry card | `src/features/multiplayer/MultiplayerHomePage.tsx` game list pattern                                    | Add a fourth game card with an icon from `src/components/icons.tsx`. Add `drawnguess` to game-kind types before exposing it.                                                                       |
| Name entry                  | `src/features/multiplayer/EnterNamePage.tsx`, `GameShell`, `PrimaryFooterButton`                        | Extend this screen with avatar selection. Keep the name form and sticky footer. Persist avatar choice alongside the room session, not just in local UI state.                                      |
| Lobby shell                 | `src/features/multiplayer/RoomLobbyView.tsx`, `GameShell`, `LobbyInviteSection`, flat player list shape | DrawNGuess is a flat-player game like Imposter, not a team game. The flat list should be able to show avatars once `LobbyPlayerDto` includes `avatarId`.                                           |
| Lobby game settings         | `src/features/multiplayer/GameSpecificLobbySections.tsx`                                                | Add a `DrawNGuessLobbySettingsCard` beside existing Hat/Imposter/WWW cards. Use the existing rounded card/details styling.                                                                         |
| Match frame                 | `src/features/multiplayer/MultiplayerGameShell.tsx`                                                     | New `DrawNGuessMultiplayerView` should mirror Hat/WWW/Imposter: thin view component, body component, footer component, local `busy/error` state, and shared end-game actions.                      |
| Primary in-game panels      | `src/components/game/GamePanel.tsx`                                                                     | Use this for prompt cards, waiting states, reveal cards, and final gallery sections. Avoid custom card chrome unless the canvas needs an edge-to-edge surface.                                     |
| Footer CTAs                 | `src/components/game/GameFooterButtons.tsx`, `src/components/ui/button.tsx`                             | Use `PrimaryFooterButton`, `SecondaryFooterButton`, and `FooterIconSlotButton` for submit, edit, reveal navigation, share/export, and final actions.                                               |
| Countdown display           | `src/components/Metric.tsx` plus existing Hat/WWW countdown update patterns                             | Build a DrawNGuess countdown hook around server deadlines. Do not invent client-authoritative timers.                                                                                              |
| Waiting / between-turn copy | `ReadyNextStepsCard`, `ReadyProgressCard`, `BetweenTurnsLayout` where it fits                           | `BetweenTurnsLayout` is useful for recap-style screens, but DrawNGuess waiting states are simultaneous-turn submission states. Prefer `GamePanel` plus smaller reused cards if the layout differs. |
| Final actions               | `MultiplayerEndGameActions` / `GameResultActions`                                                       | Reuse for `Pick another game` and `Play again`. Do not use `FinalResultsBody` because DrawNGuess has no scoring or leaderboard.                                                                    |
| Connection banners          | `RoomConnectionBanners` via existing room page flow                                                     | Keep current room connection handling. DrawNGuess-specific screens should not own connection banners.                                                                                              |
| Icons                       | `src/components/icons.tsx`                                                                              | Existing `IconPencil`, `IconShare`, `IconArrowLeft`, `IconChevronRight`, `IconRotateCcw`, `IconTrash`, and `IconCheck` cover most controls. Add only missing symbols when needed.                  |

### DrawNGuess-Specific Components

These should be new, focused components under `src/features/drawnguess/` because the existing games do not need their behavior:

| Component                     | Responsibility                                                                                                        | Reuse boundary                                                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `DrawNGuessMultiplayerView`   | Top-level multiplayer game view; wires sync payload, local busy/error state, body, and footer.                        | Mirrors `HatMultiplayerView` and `ImposterMultiplayerView`.                                                                            |
| `DrawNGuessMultiplayerBody`   | Routes snapshots to lobby-independent play screens: custom prompt, drawing, guessing, waiting, reveal, final gallery. | Keep branching here; individual screens stay small.                                                                                    |
| `DrawNGuessMultiplayerFooter` | Chooses footer actions for submit, edit, waiting, reveal navigation, gallery, replay.                                 | Reuse footer button components.                                                                                                        |
| `DrawNGuessLobbySettingsCard` | Host-only prompt mode and timer settings.                                                                             | Lives in `GameSpecificLobbySections.tsx` or a DrawNGuess-specific submodule imported there.                                            |
| `DrawNGuessAvatarPicker`      | Avatar grid with random default and selected avatar.                                                                  | Could live under `src/features/multiplayer/` if we decide avatars should be reusable across games. Start with a reusable-friendly API. |
| `DrawNGuessAvatar`            | Small display component for player avatar IDs.                                                                        | Prefer a generic `PlayerAvatar` if lobby/player rows in multiple games will use it.                                                    |
| `DrawNGuessWhiteboard`        | Canvas drawing, brush controls, undo/clear, normalized stroke editing.                                                | No Socket.IO imports. Receives `value`, `onChange`, `disabled`, and display sizing props.                                              |
| `DrawNGuessDrawingPreview`    | Renders submitted drawings and drawings-to-guess from stroke data.                                                    | Shared by guessing, waiting, reveal, gallery, and export.                                                                              |
| `DrawNGuessTurnTimer`         | Countdown ring/compact timer derived from server `turnDeadlineAt`.                                                    | Uses server timestamps and tolerates drift; no authority over turn advancement.                                                        |
| `DrawNGuessRevealFlipbook`    | Host-paced packet/page reveal.                                                                                        | Uses `GamePanel`, avatar display, footer buttons, and `IconShare`.                                                                     |
| `DrawNGuessChainExport`       | Full-chain image export for share/download.                                                                           | Client-only rendering helper; not part of core match state.                                                                            |

### Screen-To-Component Map

| Prototype screen | Production screen/component                                                 | Shared app pieces                                                                       | New DrawNGuess pieces                                                     |
| ---------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Host lobby       | `RoomLobbyView` + `GameSpecificLobbySections`                               | `GameShell`, `LobbyInviteSection`, flat player section, `Button`/footer buttons         | `DrawNGuessLobbySettingsCard`, avatar-aware player rows                   |
| Player lobby     | `RoomLobbyView`                                                             | Existing ready bar and lobby player list                                                | Avatar display in player list                                             |
| Name + avatar    | `EnterNamePage` extension                                                   | Existing name form, `GameShell`, `PrimaryFooterButton`                                  | Avatar picker and avatar persistence                                      |
| Draw brief       | Likely a brief `GamePanel` before first drawing or folded into drawing turn | `GamePanel`, `PrimaryFooterButton`, avatar display                                      | Assignment/private prompt snapshot                                        |
| Pick prompt      | `DrawNGuessCustomPromptTurn`                                                | `GamePanel`, input styling from existing forms, `PrimaryFooterButton`                   | Custom-prompt submission and edit-after-submit state                      |
| Drawing          | `DrawNGuessDrawingTurn`                                                     | `GamePanel` for prompt/details, footer buttons, icons                                   | `DrawNGuessWhiteboard`, stroke validation, local draft autosave           |
| Draw waiting     | `DrawNGuessWaitingPanel`                                                    | `GamePanel`, `ReadyNextStepsCard` if useful, footer edit action                         | Submitted drawing preview, pending player list, server deadline countdown |
| Guessing         | `DrawNGuessGuessingTurn`                                                    | `GamePanel`, existing input/button styling, `Metric`                                    | Drawing preview and guess submission                                      |
| Guess waiting    | `DrawNGuessWaitingPanel`                                                    | Same as draw waiting                                                                    | Submitted guess preview and edit flow                                     |
| Chain reveal     | `DrawNGuessRevealFlipbook`                                                  | `GamePanel`, `Button`, `IconArrowLeft`, `IconChevronRight`, `IconShare`, avatar display | Packet/page reveal state, full-chain export trigger                       |
| Final gallery    | `DrawNGuessResultsScreen`                                                   | `GamePanel`, `MultiplayerEndGameActions`                                                | Packet list, open-any-packet flow, no-score presentation                  |

### Shared Types And Data Prerequisites

- Add `drawnguess` to the canonical `GameKind` union in `server/roomStore.ts`, `RoomSyncPayload["gameKind"]`, `MultiplayerHomePage`, `gameKindLabel`, and any room tests that enumerate game kinds.
- Extend `RoomPlayer` and `LobbyPlayerDto` with `avatarId`. Joining/hosting should accept an avatar ID, validate it against a known list, and default server-side when omitted.
- Create a small avatar catalog module rather than scattering filenames. Suggested shape:

```ts
export type AvatarId = "bear" | "cat" | "...";

export const AVATAR_IDS = ["bear", "cat", "..."] as const;

export function isAvatarId(value: string): value is AvatarId;
```

- Keep avatar image assets under `src/assets/avatars/`. Import or map them through a single component/helper so Vite can bundle the referenced files reliably.
- Keep the Easy word list in `src/data/drawnguessWordPrompts.json`, but load it through a typed word-pack module with Zod validation. The server should select words; clients should not need the full deck during play.

### Build Checklist From This Pass

Before building gameplay screens:

- [x] Add `drawnguess` to shared room/game-kind typing, labels, home card, and room sync shape.
- [x] Add avatar catalog and validated `avatarId` to host/join REST payloads, room players, lobby DTOs, and lobby rows.
- [x] Extend `EnterNamePage` with avatar selection while preserving the existing name-entry flow for all games.
- [x] Add DrawNGuess lobby settings to `GameSpecificLobbySections` using existing card/details styling.
- [x] Add `src/features/drawnguess/multiplayer/` with `DrawNGuessMultiplayerView`, production turn screens, reveal, and final gallery wired into the room page.
- [x] Add `src/domain/drawnguess/` pure types and tests before Socket.IO handlers.
- [x] Add a typed word-pack loader around `src/data/drawnguessWordPrompts.json`.
- [x] Implement `DrawNGuessWhiteboard` as a pure controlled component before connecting submissions.
- [x] Keep final gallery/reveal no-score; do not route through leaderboard components.

### Styling Guardrails

- Use `GameShell` / `MultiplayerGameShell` for all player-facing DrawNGuess screens.
- Use `GamePanel` for primary screen content unless the whiteboard needs a custom canvas surface.
- Use `text-typ-*` typography tiers and semantic color tokens rather than prototype CSS values.
- Keep footer actions in the shell footer. Avoid in-card primary navigation except for secondary controls such as avatar choices or reveal page controls.
- Use existing icon components where possible. Add new icons only to `src/components/icons.tsx`.
- Treat the prototype layout as a mobile-first visual target, but align actual spacing, radii, buttons, and card chrome with existing app components.

## Recommended User Flow

### Lobby

The room flow should mirror the existing multiplayer games:

- Host selects **DrawNGuess** from the game picker.
- Players join with room code, display name, and avatar selection.
- Host configures starting prompt mode, timers, optional player limit, and reveal pacing. Word-pack support should exist server-side, but the v1 lobby does not need to expose a word-pack selector.
- Host starts the match when enough players are ready.

### Match Start

On start, the server:

- Freezes the roster order.
- In predetermined mode, selects one unique starting word per player.
- In custom mode, starts with a simultaneous text-entry turn where each player writes the starting prompt for their own packet.
- Creates one packet per player.
- Assigns packet 0 to player 0, packet 1 to player 1, and so on for the first drawing turn.
- Emits each player only their own assignment.

### Simultaneous Turns

Every turn has a `turnIndex` and a mode:

- Even `turnIndex` values are drawing turns.
- Odd `turnIndex` values are guessing turns.
- Custom-prompt mode has a setup text-entry turn before this drawing/guessing alternation begins.

For a roster of `N` players, the game needs `N` active turns after the initial words are assigned. A packet is complete when it has:

- 1 starting word.
- `N` player submissions.

Packet assignment can be deterministic:

```ts
packetIndexForPlayer = (playerIndex - turnIndex + playerCount) % playerCount;
```

That sends each packet to a different player every turn and eventually returns every packet to the full roster.

### Drawing Turn

Each player sees:

- Current turn number and progress.
- The text prompt from their assigned packet's latest non-drawing entry.
- A whiteboard.
- Brush controls: color, brush size, eraser, clear, undo if included.
- Submit state and waiting state after submission. While the timer is still running, players can return from the waiting state to edit and resubmit their drawing.

Players must not see other active prompts or drawings during the turn.

### Guessing Turn

Each player sees:

- Current turn number and progress.
- The latest drawing from their assigned packet.
- A single text input.
- Submit state and waiting state after submission. While the timer is still running, players can return from the waiting state to edit and resubmit their guess.

The guess should be short and plain text. Validate length and trim whitespace on the server.

### Waiting State

After a player submits, they see:

- Their submitted drawing or guess.
- The active turn countdown.
- An edit action that returns them to the drawing or guessing screen before time expires.
- Which players are still submitting, preferably names only, not their content.
- Connection status and reconnect copy.

Turns should auto-submit on timer end. The server should accept whatever partial entry the player has produced:

- For drawings, submit the current stroke data. If no drawing data exists or the player is disconnected, submit a generated placeholder drawing that clearly says "No response submitted".
- For guesses, submit the current trimmed text. If no text exists or the player is disconnected, submit a placeholder guess such as `[no response submitted]` so it is distinguishable from a real guess.

To avoid race conditions at the timer boundary, the server should use a short grace window between "timer expired" and "turn advanced". During that window it can accept final in-flight submissions, then fill missing entries with placeholders and emit the next turn snapshot. A short waiting state between turns is acceptable.

### Reveal

When all packets are complete:

- Each player presents their own starting chain, meaning the packet whose first word was assigned to them.
- The reveal screen should behave like a flip book, showing one entry at a time for suspense rather than showing the completed chain immediately.
- All clients see the same packet and reveal step while the current presenter advances through their chain.
- Each reveal step shows who created it.
- The reveal screen should include a share/export control. The exported image should be the full chain as one image, not the current flipbook card.
- Final view shows all answer packets with access to any completed chain and a replay/new game action.

## Domain Model

Add framework-free domain code under `src/domain/drawnguess/`.

Suggested types:

```ts
export type DrawNGuessMode = "drawing" | "guessing" | "reveal" | "complete";

export type DrawNGuessEntry =
  | {
      type: "word";
      playerId: "deck";
      text: string;
      createdAt: number;
    }
  | {
      type: "drawing";
      playerId: string;
      drawing: DrawNGuessDrawing;
      createdAt: number;
    }
  | {
      type: "guess";
      playerId: string;
      text: string;
      createdAt: number;
    };

export type DrawNGuessDrawing =
  | {
      format: "strokes-v1";
      width: number;
      height: number;
      strokes: DrawNGuessStroke[];
    }
  | {
      format: "png-data-url";
      width: number;
      height: number;
      dataUrl: string;
    };

export type DrawNGuessPacket = {
  id: string;
  starterPlayerId: string;
  entries: DrawNGuessEntry[];
};

export type DrawNGuessMatch = {
  gameKind: "drawnguess";
  rosterOrder: string[];
  settings: DrawNGuessSettings;
  phase: "lobby" | "turn" | "reveal" | "complete";
  turnIndex: number;
  packets: DrawNGuessPacket[];
  submissionsByTurn: Record<number, Record<string, boolean>>;
  revealPacketIndex: number;
  revealEntryIndex: number;
};
```

Core pure functions:

- `createDrawNGuessMatch(roster, settings, wordSource, rng)`.
- `getTurnMode(turnIndex)`.
- `getPacketIndexForPlayer(playerIndex, turnIndex, playerCount)`.
- `getAssignmentForPlayer(match, playerId)`.
- `submitDrawing(match, playerId, drawing, now)`.
- `submitGuess(match, playerId, guess, now)`.
- `isTurnComplete(match)`.
- `advanceTurn(match, now)`.
- `advanceReveal(match)`.
- `getPublicMatchSnapshot(match)`.
- `getPrivatePlayerSnapshot(match, playerId)`.

Keep these free of React, Socket.IO, filesystem, and browser APIs.

## Drawing Data Strategy

Prefer **stroke data** for production v1:

- Smaller than frequent PNG snapshots for simple drawings.
- Easier to validate with Zod.
- Can render consistently on each client canvas.
- Supports undo by removing the last stroke.

Stroke schema:

```ts
type DrawNGuessStroke = {
  id: string;
  color: string;
  size: number;
  tool: "pen" | "eraser";
  points: Array<{ x: number; y: number }>;
};
```

Store normalized coordinates from `0` to `1`, then render to the actual canvas size. This avoids device-specific dimensions becoming part of the game state.

PNG export can still be generated client-side for final share/download later, but it should not be required for core gameplay.

## Socket.IO Contract

Existing room events should be extended without adding auth or a database. Runtime state remains in the Node process RAM.

Suggested client-to-server events:

- `drawnguess:updateSettings`
- `drawnguess:startMatch`
- `drawnguess:submitDrawing`
- `drawnguess:submitGuess`
- `drawnguess:advanceTurn`
- `drawnguess:advanceReveal`
- `drawnguess:restart`

Suggested server-to-client snapshots:

```ts
type DrawNGuessClientSnapshot = {
  public: {
    phase: DrawNGuessMatch["phase"];
    settings: DrawNGuessSettings;
    rosterOrder: string[];
    turnIndex: number;
    turnMode: "drawing" | "guessing";
    submittedPlayerIds: string[];
    reveal?: {
      packetIndex: number;
      entryIndex: number;
      presenterPlayerId: string;
      visibleEntries: DrawNGuessEntry[];
    };
  };
  private?: {
    assignedPacketId: string;
    promptText?: string;
    drawingToGuess?: DrawNGuessDrawing;
    hasSubmitted: boolean;
  };
};
```

Important privacy rule: the server should not send unrevealed words, active drawings, or active guesses to players who do not need them.

## Server Work

Likely files to touch:

- `server/roomStore.ts` or the current room state module.
- `server/socketHandlers.ts` or equivalent Socket.IO handler modules.
- `src/multiplayer/roomTypes.ts`.
- Any game-kind label or lobby selection helpers.

Server responsibilities:

- Add `"drawnguess"` as a game kind.
- Validate DrawNGuess settings with Zod.
- Add DrawNGuess match state to room state.
- Handle reconnect by resending the same private assignment to the same player.
- Guard host-only actions such as start, force advance, reveal advance, and restart.
- Allow a player to replace their own current-turn submission until the server deadline/grace window closes. Reject duplicate submissions after the turn is locked.
- Apply timer expiry consistently with server-authoritative deadlines, a short grace window, and placeholder auto-submissions for missing entries.

## Client Work

Likely files or folders:

- `src/features/drawnguess/`
- `src/features/drawnguess/multiplayer/DrawNGuessMultiplayerView.tsx`
- `src/domain/drawnguess/`
- `src/data/drawnguessWordPrompts.json`
- `src/assets/avatars/`
- `src/multiplayer/gameKindLabel.ts`
- `src/features/multiplayer/GameSpecificLobbySections.tsx`
- `src/features/multiplayer/MultiplayerGameShell.tsx`
- `src/features/multiplayer/MultiplayerHomePage.tsx`

Suggested screens:

- `DrawNGuessNameAvatarEntry`
- `DrawNGuessLobbySettings`
- `DrawNGuessCustomPromptTurn`
- `DrawNGuessTurnShell`
- `DrawNGuessDrawingTurn`
- `DrawNGuessGuessingTurn`
- `DrawNGuessWaitingPanel`
- `DrawNGuessRevealScreen`
- `DrawNGuessResultsScreen`

Use existing app chrome where possible:

- `GameShell` for the multiplayer game frame.
- `GamePanel` for major in-game content.
- Existing room connection banners.
- Existing lobby captain and invite sections.

The whiteboard itself should be a focused component with no Socket.IO imports. It should receive a `value`, `onChange`, and disabled/submitted state from the game view.

The final gallery should not rank chains. It should list answer packets and let players open any completed packet. The reveal flow should be presenter-led and flipbook-style; the export/share view can render a separate full-chain image.

## Word List

The cleaned v1 word source lives at `src/data/drawnguessWordPrompts.json`. It contains the Easy prompts from all current categories:

- `Standard`
- `Kids`
- `Sports`

The source JSON has metadata removed, but each prompt keeps `phrase`, `category`, and `difficulty` so later settings can filter by category and difficulty.

Validation rules:

- At least as many eligible words as players.
- No duplicate starting words within a match.
- Pack IDs are stable strings.
- Room settings store a `wordPackId`, even if only one pack is visible in v1.
- Room settings also store `startingPromptMode: "predetermined" | "custom"`. `wordPackId` is required for predetermined mode and ignored for custom mode.
- v1 should load Easy prompts from all categories. Future settings can expose `category` and `difficulty` filters without changing the data shape.
- The client may display pack names, but final word selection happens server-side.

## Avatars

Avatar image assets live under `src/assets/avatars/` as 512x512 WebP files. The join/name entry flow should:

- Pick a random avatar by default.
- Let the player change avatars before joining.
- Include the selected avatar in the room player profile.
- Display avatars in lobbies, waiting states, reveal presenter controls, and final packet lists.

Recommended rendering sizes:

- 32-48 px in compact rows and lobbies.
- 64-96 px for name entry, player detail, or presenter moments.

## Timer Policy

Recommended v1:

- Server stores `turnStartedAt`, `turnDeadlineAt`, `drawingDurationMs`, and `guessDurationMs`.
- Default durations are `drawingDurationMs = 60_000` and `guessDurationMs = 30_000`.
- Clients render countdown from server time and tolerate drift.
- Server accepts submissions until a short post-deadline grace window closes.
- Players may edit their submitted drawing or guess until the deadline closes; the latest valid submission wins.
- When the timer expires, server-side auto-submit fills each player's assigned packet with their partial entry or a placeholder.
- Host can advance early when all players submit, but timer expiry should not depend on host interaction.

Avoid client-only timers for turn advancement because reconnects and background tabs will disagree.

## Validation And Abuse Limits

Even without auth, validate all Socket.IO payloads:

- Guess text: trim, min 1 char, max 42 chars.
- Stroke count: cap per drawing.
- Points per stroke: cap per stroke.
- Color: allowlist known colors or validate hex.
- Brush size: numeric range.
- Canvas dimensions: fixed or capped.
- Submission only from a player currently assigned to that packet.

Add payload size limits or reject drawings with too many points. This matters because drawing events can be much larger than text guesses.

## Testing Plan

Domain tests:

- Packet rotation is correct for 3, 5, and 8 players.
- Every player receives every packet exactly once.
- Predetermined mode creates one unique server-selected starting prompt per packet.
- Custom mode records each player's submitted text as their packet's original prompt before drawing turns begin.
- Drawing and guessing modes alternate correctly.
- Starting words are unique.
- Duplicate out-of-turn submissions are rejected.
- Same-player current-turn replacement submissions are accepted until the turn locks, and the latest valid entry wins.
- Turn advances when complete, when the host advances an already-complete turn, or when the server timer plus grace window auto-submits missing entries.
- Timer auto-submit preserves partial drawings/guesses when present.
- Timer auto-submit creates drawing and text placeholders for missing or disconnected players.
- Reveal progression stops at the end and reaches complete state.
- Reveal presenter order maps each player to their own starting chain.

Server tests:

- Host can start DrawNGuess from a lobby.
- Non-host cannot start or force advance.
- Private snapshots only include the active player's assignment.
- Reconnect sends the same assignment and submitted state.
- Timer expiry handles race conditions between late client submission and server placeholder fill.
- Invalid drawing payloads are rejected.

Client tests:

- Drawing screen renders prompt and whiteboard.
- Guessing screen renders drawing and text entry.
- Submit buttons move players into waiting state after submission.
- Waiting panel lists submitted/pending players, shows the countdown, and allows editing while the timer is open.
- Reveal screen steps through packet entries.

Manual QA:

- Use `docs/MULTIPLAYER_QA.md` as the baseline because this is Socket.IO room work.
- Add DrawNGuess-specific checks for two browsers, mobile viewport canvas input, reconnect during drawing, reconnect during guessing, and host advancing reveal.

Required deterministic checks before shipping production implementation:

```bash
pnpm run typecheck
pnpm test
pnpm run lint
pnpm run build
```

For a significant implementation, also run:

```bash
pnpm dlx fallow --no-cache --format human
```

## Implementation Sequence

1. Add `drawnguess` domain types and pure match engine with tests.
2. Add word pack data and validation.
3. Add room/game-kind plumbing and lobby selection.
4. Add Socket.IO handlers and private/public snapshots.
5. Add multiplayer UI shell and lobby settings.
6. Build whiteboard component using normalized stroke data.
7. Add drawing, guessing, waiting, reveal, and result screens.
8. Add reconnect handling and timer expiry behavior.
9. Run deterministic checks and multiplayer manual QA.
10. Update version, changelog, screen docs, and any decisions if the implementation adds durable architecture choices.

## Open Questions

- Should the host be able to skip a disconnected player, and what placeholder appears in the reveal?
- Should drawings be downloadable after the game?
- Should word packs be visible to all players before the match starts, or stay hidden behind a default v1 pack?
- Should the game support spectators in the future? This should not be built in v1 unless explicitly requested.

## Prototype Notes

The standalone prototype demonstrates:

- Host setup and player readiness.
- Simultaneous drawing turn with a real canvas.
- Simultaneous guessing turn with text entry.
- Packet summary and current-player assignment.
- Flipbook reveal, presenter-owned starting chains, full-chain image export, and final packet access.

Run it by opening:

```text
prototypes/drawnguess/index.html
```

It intentionally uses no production imports, no new package dependencies, and no production route registration.
