# DrawNGuess

DrawNGuess is a production multiplayer game in RVLRY. It is a Telestrations-style simultaneous-turn game: every player starts a book, players alternate drawing and guessing, then each player presents their own completed book before the final gallery.

## Product Rules

- **Players:** 3-8 players.
- **Scoring:** none. The outcome is social presentation and the final gallery.
- **Prompt modes:** predetermined words by default, or custom player-written prompts.
- **Default timers:** 60 seconds for drawing, 30 seconds for guessing.
- **Turn completion:** the server advances immediately when every player has submitted. If time expires first, the server waits through a short grace window, then auto-submits drafts or placeholders.
- **Presentation:** each player sees and locally controls only their own book. Players take turns presenting socially, then move to the final gallery.
- **Final gallery:** players can open any completed book, page through it, and export/share a full-chain PNG.

## Main Files

| Area           | Files                                                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Pure rules     | `src/domain/drawnguess/engine.ts`, `src/domain/drawnguess/types.ts`                                                                       |
| Word packs     | `src/domain/drawnguess/wordPacks.ts`, `src/data/drawnguessWordPrompts.json`                                                               |
| Server runtime | `server/drawnguessRuntime.ts`, `server/drawnguessTicker.ts`, `server/drawnguessViews.ts`                                                  |
| Socket wiring  | `server/socketHandlers.ts`, `src/domain/multiplayer/socketSchemas.ts`, `server/sync.ts`                                                   |
| Production UI  | `src/features/drawnguess/multiplayer/DrawNGuessMultiplayerView.tsx`                                                                       |
| Drawing UI     | `src/features/drawnguess/multiplayer/DrawNGuessWhiteboard.tsx`, `src/features/drawnguess/multiplayer/DrawNGuessDrawingPreview.tsx`        |
| Avatars        | `src/multiplayer/avatarCatalog.ts`, `src/components/PlayerAvatar.tsx`, `src/features/multiplayer/AvatarPicker.tsx`, `src/assets/avatars/` |

## Runtime Flow

1. Host creates a DrawNGuess room from the multiplayer picker.
2. Players join with a display name and avatar.
3. Host chooses predetermined or custom prompts, plus drawing and guessing timers.
4. Predetermined mode starts directly with drawing. Custom mode starts with one text-entry prompt turn.
5. Drawing and guessing turns alternate until every book has passed through every player.
6. During draw/guess turns, clients show the server deadline countdown and play the shared 10-second warning cue once per turn.
7. Players can submit, wait, and edit before the deadline. The server stores drafts so timer expiry can preserve partial entries.
8. Presentation starts when all books are complete. Each player controls their own book locally.
9. Final gallery lets any player review and export any completed book.

Each turn view initializes its draft from the server once. Later room broadcasts
update progress but cannot overwrite that device's editor or cancel an edit.
Draft text retains whitespace; explicit submission and timer expiry trim it.
All six draft/submission requests from current clients include a `turnKey`
(`turnIndex:turnMode:deadlineAt`), which the server checks before mutation. The
field is optional only for compatibility with clients loaded before its addition.

The editor enforces the server's 200-stroke, 2,000-points-per-stroke,
6,000-total-point, and 192-KiB drawing limits. Coordinates round to three decimal
places (at most 0.32px error at 640px width); repeated identical points are
ignored. When a limit is reached, existing work stays submitable and a notice
offers undo/clear. Active strokes finish at the client deadline.

Drafts coalesce at a one-second interval with one request in flight and one
latest pending value. Explicit submission cancels unsent drafts and waits for
an in-flight draft before sending the final value. A turn change cancels queued
work; actions are not replayed after a lost connection. Editing a submitted
response immediately withdraws its submitted status. Private draft-only updates
sync to the player's bound tabs; status changes still broadcast to all players.
The engine copies changed paths and treats previously stored drawings as
immutable, so adding a draft does not clone all prior books.

## Data And Settings

The v1 word source is `src/data/drawnguessWordPrompts.json`. It contains Easy prompts from Standard, Kids, and Sports categories. The current UI exposes only the default word pack, but the domain settings keep a `wordPackId` so category and difficulty filtering can be added later without reshaping match state.

Avatars are 512x512 WebP files bundled from `src/assets/avatars/`. The server validates avatar IDs in host/join payloads and defaults missing or invalid values.

## Socket Events

DrawNGuess extends the existing room Socket.IO contract with:

- `lobby:hostPatchDrawNGuessSettings`
- `drawnguess:updatePromptDraft`
- `drawnguess:submitPrompt`
- `drawnguess:updateDrawingDraft`
- `drawnguess:submitDrawing`
- `drawnguess:updateGuessDraft`
- `drawnguess:submitGuess`
- `drawnguess:advanceTurn`
- `drawnguess:advanceReveal`
- `drawnguess:openRevealPacket`

`advanceReveal` and `openRevealPacket` remain in the server contract for compatibility with earlier reveal state and final-gallery packet opening, but the current presentation and final-gallery page navigation are local UI state.

## Testing

Automated coverage lives in:

- `src/domain/drawnguess/engine.test.ts`
- `server/drawnguessRuntime.test.ts`
- `src/features/drawnguess/multiplayer/DrawNGuessMultiplayerView.test.tsx`

Before release, use `docs/MULTIPLAYER_QA.md` and include the DrawNGuess-specific checks for mobile drawing input, reconnects, timer expiry, presentation, and final-gallery export.
