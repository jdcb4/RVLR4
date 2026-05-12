# Naming conventions

Single source of truth for symbol, file, and folder names in this repo.
Companion to `docs/NAMING_AUDIT.md` (the one-shot audit that produced these
rules). Re-run `pnpm run audit:names` after large refactors.

## 1. Game brand tokens

The wire-format `GameKind` literal in
[`server/roomStore.ts`](../server/roomStore.ts) is the source of truth:

```ts
export type GameKind = "whowhatwhere" | "hat" | "imposter";
```

Symbols must follow this in their case-folded forms:

| Game | Literal | camelCase | PascalCase | Folder |
|---|---|---|---|---|
| Who What Where | `"whowhatwhere"` | `whoWhatWhere` | `WhoWhatWhere` | `whowhatwhere/` |
| Hat Game | `"hat"` | `hat` | `Hat` | `hat-game/` |
| Imposter | `"imposter"` | `imposter` | `Imposter` | `imposter/` |

**`Www*` / `www*` short forms are banned in new code.** They obscure
search-ability without shortening symbols meaningfully on a screen.

**`HatGame*` is allowed only on the four domain types where it reads more
naturally and removes ambiguity in cross-game contexts**:
`HatGameSession`, `HatGameAction`, `HatGameConfig`, `HatGamePhaseMeta`.
Every other Hat symbol uses `Hat*` / `hat*`.

## 2. Mode modifiers

Two play modes. The **UX** labels are "Multi-Device" and "Pass-and-Play",
but the **code** uses different tokens for clarity and history:

| Mode | UX label | Code modifier | Notes |
|---|---|---|---|
| Multi-Device | "Multi-Device mode" | `Multiplayer*` / `multiplayer*` | Matches what the implementation actually is (networked rooms via Socket.IO). |
| Pass-and-Play | "Pass-and-Play mode" | `Singleplayer*` / `singleplayer*` | Disambiguates pass-and-play code from its multiplayer counterpart when read in isolation. |

### When to apply a modifier

Add a mode modifier to a symbol when it has a counterpart in the **other**
mode for the same game. Otherwise leave it bare.

| Surface | Bare | With modifier |
|---|---|---|
| Top-level app component (per game) | (banned) | `HatSingleplayerApp`, `WhoWhatWhereMultiplayerView` |
| Mode-shell component | (banned for mode-specific UI) | `MultiplayerGameShell`, `MultiplayerHomePage` |
| Hook (per game) | (banned) | `useHatSingleplayerApp`, `useRoomChannel` (mode-shell hook) |
| Domain logic, shared utilities | bare | `createMatch`, `useAutoHidePopup` |
| Server-only code under `server/` | bare | Location implies multiplayer; no suffix needed |
| Wire-format event names | bare game | `hat:correct`, `www:revealHint` |

The server folder is treated as multiplayer-only by convention — server
exports don't get a `Multiplayer*` prefix even though they implement the
mode. The `server/` location is the modifier.

### Why `Singleplayer*` even though the implementation is single-device?

The pass-and-play code shipped first and accreted bare names
(`WhoWhatWhereApp`, `useHatGameApp`). When the multiplayer counterpart
arrived, `Multiplayer*` modifiers were added on the new side only — but
the older bare names now read ambiguously when grepping or reviewing.
Adding `Singleplayer*` to the older side gives true symmetry. `pnpm run
audit:names` will flag any new singleplayer-side app/hook that omits the
modifier.

## 3. Action verbs

When a function name starts with a verb, use the canonical verb from this
table. Synonyms are banned to keep grep-ability high.

| Concept | Canonical verb | Example |
|---|---|---|
| Build a plain value/structure | `build*` | `buildGameLandingScreen` |
| Construct a domain entity | `create*` | `createMatch`, `createHatGameSession` |
| Initiate a runtime process | `start*` | `startWhoWhatWhereMatch`, `startTurn`, `startRoomIdleSweeper` |
| Apply an action to state | `apply*` | `applyWhoWhatWhereCorrect` |
| Read from storage | `load*` | `loadServerEnv`, `loadSession` |
| Persist to storage | `save*` / `persist*` | `saveSetup`, `persistSession` |
| Wipe storage | `clear*` | `clearSession` |
| Get a derived value | `get*` / `format*` / `compute*` | `getActiveContext`, `formatSavedAt`, `computeResumeEligible` |
| React hook | `use*` | `useRoomChannel` |
| Type-guard predicate | `is*` / `can*` / `should*` | `isStoragePayload`, `canQueueSkipped` |

**Banned synonyms:** `begin*`, `commence*`, `launch*`, `initiate*` (use
`start*`); `make*` / `construct*` (use `create*` or `build*`); `fetch*` for
non-network reads (use `load*` / `get*`); `wipe*` (use `clear*`).

## 4. Cross-game parallel actions

When two games expose the **same** domain action, the verb and object
words after the game tag must match:

```
apply<Game><Verb><Object>
```

The canonical action vocabulary, locked in:

| Concept | Canonical name fragment |
|---|---|
| Start the active turn | `StartTurn` |
| End the active turn | `EndTurn` |
| Mark the current word/clue correct | `Correct` |
| Skip the current word/clue | `Skip` |
| Return a skipped word | `ReturnSkipped` |
| Transition match to final-scores stage | `ShowFinalScores` |
| Reveal a hint for the current word | `RevealHint` |
| Server-side timer expiry | `ExpireTurn` |

So: `applyHatCorrect`, `applyWhoWhatWhereCorrect`, `applyHatSkip`,
`applyWhoWhatWhereSkip`, `applyHatShowFinalScores`,
`applyWhoWhatWhereShowFinalScores`, etc.

Wire-format Socket.IO events follow the same vocabulary,
case-folded: `hat:correct`, `hat:skip`, `hat:showFinalScores`,
`www:correct`, `www:skip`, `www:showFinalScores`.

## 5. Hook names

`use<Subject>` — PascalCase subject, no `App` / `Controller` suffix
variance. The three per-game app hooks pair like-for-like:

- `useWhoWhatWhereSingleplayerApp`
- `useHatSingleplayerApp`
- `useImposterSingleplayerApp`

Shared utility hooks describe the behavior, not a subject: `useRoomChannel`,
`useAutoHidePopup`, `useFooterActionLockOnKeyChange`.

## 6. File names

| Kind | Case | Examples |
|---|---|---|
| React component (one primary export) | `PascalCase.tsx` | `HatMultiplayerView.tsx`, `RoomPage.tsx` |
| Screen *builder* function (returns `ScreenModel`) | `camelCase.tsx` | `hatLandingScreen.tsx`, `imposterResultsScreen.tsx` |
| Hooks, utilities, types | `camelCase.ts` | `useRoomChannel.ts`, `viewModel.ts` |
| Folders | `kebab-case` | `hat-game/`, `team-setup/`, `final-results/` |

## 7. Tooling

- `pnpm run audit:names` — re-walks every export, prints a JSON-Lines
  inventory. Use after large refactors or before adding a new game.
- ESLint enforces a minimal `typeLike` PascalCase rule in
  `eslint.config.js`. Cross-game and mode-modifier consistency are caught
  by the audit script, not the linter (categorical rules can't express
  "your function must use the same verb as the parallel one in another
  game").
- See [`docs/NAMING_AUDIT.md`](NAMING_AUDIT.md) for the original audit
  data and remediation sequence.
