# Naming audit + remediation plan

Generated from a deterministic walk of every exported symbol in `src/` and
`server/` (410 symbols total) via `scripts/audit-names.mts`, using the
TypeScript compiler API. **No code changes have been made.** This document
is a proposal — apply only after you sign off on the conventions in §2.

To regenerate the underlying data:

```powershell
pnpm exec tsx scripts/audit-names.mts 1> audit-names.jsonl 2> audit-names.stderr
```

The JSON-Lines output captures `{ file, name, kind, isComponent, isHook,
verb, gameTags, modeTags }` per export. Sliced and counted with `node -e`
queries (see commit message for the exact queries used to derive the
findings below).

---

## 1. Executive summary

The codebase is mostly self-consistent on **verbs** and **suffix shapes**
but inconsistent on three axes:

1. **Per-game brand name** has multiple forms in code:
   - Hat: `Hat*` (24 symbols), `HatGame*` (5 symbols) — same game, two forms.
   - Who What Where: `WhoWhatWhere*` (19 symbols), `Www*` / `*Www*` (8
     symbols) — same game, long-form vs short-form.
   - Imposter: `Imposter*` only — already consistent ✅.
2. **Mode label** in code is `Multiplayer*` (the original framing) even
   though the UX label is now **Multi-Device mode** (renamed in 0.15.1–
   0.15.6). One canonical decision needed; either is defensible.
3. **Cross-game parallel actions** sometimes use different verbs/nouns for
   the same concept (e.g. `applyHatCorrect` vs `applyWhoWhatWhereCorrect`).
   This is the original "startHatGame vs commenceWhoWhatWhere" class of
   issue you flagged.

There is **no documented naming convention** today and **no ESLint
`naming-convention` rule** in `eslint.config.js`. The fixes below should
land alongside both: a `docs/NAMING.md` and an ESLint rule that prevents
regressions.

---

## 2. Proposed conventions (to document at `docs/NAMING.md`)

### 2.1 Game brand names

The wire-format `GameKind` literal in [`server/roomStore.ts:17`](../server/roomStore.ts)
is the source of truth:

```ts
export type GameKind = "whowhatwhere" | "hat" | "imposter";
```

Code symbols should follow this in their case-folded forms:

| Game | Literal | camelCase | PascalCase | Folder |
|---|---|---|---|---|
| Who What Where | `"whowhatwhere"` | `whoWhatWhere` | `WhoWhatWhere` | `whowhatwhere/` |
| Hat Game | `"hat"` | `hat` | `Hat` | `hat-game/` |
| Imposter | `"imposter"` | `imposter` | `Imposter` | `imposter/` |

**Rationale for Hat short form:** the wire-format literal is `"hat"`, the
shortest unambiguous tag within this app. Using `HatGame*` in symbols is
clearer in isolation but creates a mismatch with the protocol literal and
forces a wire-breaking change. Folder name `hat-game/` is kept — folders
are descriptive labels, not tokens that propagate through the type system.

**Alternative considered (not recommended):** make `"hatGame"` the literal,
rename `Hat*` → `HatGame*` everywhere. Trades ~25 symbol renames + a wire
format break for marginal clarity. Reject.

**`Www*` and `www*` short forms are eliminated.** They obscure
search-ability and don't shorten code meaningfully on a screen
(`WhoWhatWhereLastTurnCard` vs `WhoWhatWhereLastTurnCard` — 8 chars).

### 2.2 Mode names

The UX labels are **Multi-Device mode** and **Pass-and-Play mode**. Two
defensible code conventions:

- **Option M-A (recommended, minimal churn):** code keeps the technical
  term **`Multiplayer*`** for the networked subsystem (Socket.IO, rooms,
  sync), since that *is* what the implementation does. Treat
  "Multi-Device" as the UX-only marketing label. Pass-and-Play has no code
  prefix today and stays that way — there's no networked counterpart.
- **Option M-B (more churn, perfect mode-symmetry):** rename every
  `Multiplayer*` symbol → `MultiDevice*` and adopt `PassNPlay*` where a
  symbol is mode-specific. Roughly 11 symbol renames + 1 folder
  (`src/multiplayer/` → `src/multi-device/`) + 1 server env var
  (`MULTIPLAYER_DEBUG` is wire-facing — rename would be deploy-affecting).

**Recommendation: M-A.** Symbol churn doesn't gain semantic clarity —
"multiplayer" is the technical truth in code. Update only user-facing
strings (already done in 0.15.1–0.15.6). The docstring on
`src/multiplayer/` should note "the Multi-Device mode implementation
(networked rooms via Socket.IO)" for newcomers.

### 2.3 Verbs (action prefix)

Already consistent in 95% of the codebase — see §4. Adopt as policy:

| Concept | Canonical verb | Example |
|---|---|---|
| Build something pure | `build*` | `buildGameLandingScreen` |
| Construct a domain entity | `create*` | `createMatch`, `createHatGameSession` |
| Initiate a runtime process | `start*` | `startWhoWhatWhereMatch`, `startTurn`, `startRoomIdleSweeper` |
| Apply an action to state | `apply*` | `applyWhoWhatWhereCorrect` |
| Read from storage | `load*` | `loadServerEnv`, `loadSession` |
| Persist to storage | `save*` / `persist*` | `saveSetup`, `persistSession` |
| Wipe storage | `clear*` | `clearSession` |
| Get a derived value | `get*` / `format*` / `compute*` | `getActiveContext`, `formatSavedAt`, `computeResumeEligible` |
| React hook | `use*` | `useRoomChannel` |
| Type-guard predicate | `is*` / `can*` / `should*` | `isStoragePayload`, `canQueueSkipped` |

**Banned synonyms (zero current occurrences — keep it that way):**
`begin*`, `commence*`, `launch*`, `initiate*` (use `start*`); `make*` /
`construct*` (use `create*` or `build*`); `fetch*` for non-network reads
(use `load*` / `get*`).

### 2.4 Cross-game parallel actions

When two games expose the *same* domain action, the verb and object words
after the game tag must match:

```
apply<Game><Verb><Object>
```

| Concept | Hat | WhoWhatWhere | Status |
|---|---|---|---|
| Mark current word correct | `applyHatCorrect` | `applyWhoWhatWhereCorrect` | ❌ Hat has extra `Mark` |
| Skip the current word/clue | `applyHatSkip` | `applyWhoWhatWhereSkip` | ❌ Hat has extra `Clue` |
| Return a skipped word | `applyHatReturnSkipped` | `applyWhoWhatWhereReturnSkipped` | ✅ |
| Start the turn | `applyHatStartTurn` | `applyWhoWhatWhereStartTurn` | ✅ |
| End the turn | `applyHatEndTurn` | `applyWhoWhatWhereEndTurn` | ✅ |
| Show final scores | `applyHatShowFinalScores` | `applyWhoWhatWhereShowFinalScores` | ❌ different action words |

See §3.2 for the proposed renames.

### 2.5 Hook names

`use<Subject>` PascalCase subject, no `App`/`Controller` suffix variance:

- `useWhoWhatWhereSingleplayerApp` in WWW is the odd one out (`useHatSingleplayerApp`,
  `useImposterSingleplayerApp` are the parallel pair). Rename to `useWhoWhatWhereApp`.
- Shared utility hooks describe the behavior: `useAutoHidePopup`,
  `useFooterActionLockOnKeyChange`, `useRoomChannel`. Keep.

### 2.6 File names

| Kind | Case | Examples |
|---|---|---|
| React component (one default-ish export) | `PascalCase.tsx` | `HatMultiplayerView.tsx`, `RoomPage.tsx` |
| Screen *builder* function (returns `ScreenModel`) | `camelCase.tsx` | `hatLandingScreen.tsx`, `imposterResultsScreen.tsx` |
| Hooks, utilities, types | `camelCase.ts` | `useHatSingleplayerApp.ts`, `viewModel.ts` |
| Folders | `kebab-case` | `hat-game/`, `team-setup/`, `final-results/` |

Today's data: 55 PascalCase .tsx (✅), 26 camelCase .tsx (mostly screen
builders ✅), 80 camelCase .ts (✅), 0 PascalCase .ts (✅). The
file-name dimension is already clean.

### 2.7 Tooling

To prevent regressions add to `eslint.config.js`:

```js
"@typescript-eslint/naming-convention": [
  "error",
  { selector: "function", format: ["camelCase", "PascalCase"] },
  { selector: "variable", modifiers: ["const"], format: ["camelCase", "PascalCase", "UPPER_CASE"] },
  { selector: "typeLike", format: ["PascalCase"] },
  // Hooks
  { selector: "function", filter: { regex: "^use[A-Z]", match: true }, format: ["camelCase"], prefix: ["use"] },
],
```

This catches the categorical cases (PascalCase for types, camelCase
for functions). It does **not** catch cross-game parallel-action
mismatches — those need the audit script (§7) in CI as a non-blocking
check.

---

## 3. Inconsistencies found

### 3.1 Per-game brand variants

#### Hat — `Hat*` vs `HatGame*` (29 occurrences total)

| Symbol | Current | Recommended | Why |
|---|---|---|---|
| `HatSingleplayerApp` (component) | mixed | rename to `HatApp` | parallel to `WhoWhatWhereSingleplayerApp`, `ImposterSingleplayerApp` |
| `HatSingleplayerWebScreens` (file + export) | mixed | rename to `HatWebScreens` | parallel to `ImposterSingleplayerWebScreens` |
| `HatGameSession` (type) | mixed | **keep** | "session" is the domain concept; `HatGame` here reads naturally |
| `HatGameAction` (type) | mixed | **keep** | same |
| `HatGameConfig` (type) | mixed | **keep** | same |
| `HatGamePhaseMeta` (type) | mixed | **keep** | same |
| `useHatSingleplayerApp` (hook) | mixed | rename to `useHatApp` | parallel to `useImposterSingleplayerApp` |
| `hatActionSound` (file) | mixed | keep file, but tighten symbol names |
| `hatSingleplayerAppTypes` (file) | mixed | rename to `hatAppTypes` | parallel to `imposterSingleplayerAppTypes` |
| `hatDefaults` (file) | mixed | rename to `hatDefaults` | parallel to `imposterDefaults` |
| `hatSound`, `hatStorage` (files) | mixed | rename to `hatSound`, `hatStorage` | parallel to `imposterStorage`… wait |

**Edge case: `imposterStorage.ts` vs `hatStorage.ts`.** Both
currently include `Game`. Decide one: drop `Game` from both →
`hatStorage.ts`, `imposterStorage.ts`. (Recommended.)

#### Who What Where — `WhoWhatWhere*` vs `Www*` / `www*` (24+8 occurrences)

8 short-form occurrences to rename:

| Current | Recommended |
|---|---|
| `WhoWhatWhereLandingScreen` (component) | `WhoWhatWhereLandingScreen` |
| `WhoWhatWhereReviewTeamsScreen` (component) | `WhoWhatWhereReviewTeamsScreen` |
| `WhoWhatWhereLastTurnCard` (component) | `WhoWhatWhereLastTurnCard` |
| `whoWhatWhereGallerySettings`, `whoWhatWhereGalleryTeamSetups`, `wwwGalleryMatch*` (5 consts in `whoWhatWhereGallerySessions.ts`) | `whoWhatWhereGallery*` |
| `formatWhoWhatWhereTurnClock` (fn) | `formatWhoWhatWhereTurnClock` |
| `hostPatchWhoWhatWhereSettings` (fn) | `hostPatchWhoWhatWhereSettings` |
| `mapFinalResultsFromWhoWhatWhere` (fn) | `mapFinalResultsFromWhoWhatWhere` |
| `viewerWhoWhatWhereTeamIsWinner` (fn) | `viewerWhoWhatWhereTeamIsWinner` |
| `reviewDisplayRowsFromWhoWhatWhere` (fn) | `reviewDisplayRowsFromWhoWhatWhere` |
| `whoWhatWhereGallerySessions.ts` (file) | `whoWhatWhereGallerySessions.ts` |
| `server/whoWhatWhereRuntime.ts`, `whoWhatWhereTicker.ts`, `whoWhatWhereViews.ts` (files) | `whoWhatWhereRuntime.ts`, etc. |

#### Imposter — already canonical ✅

No renames needed.

### 3.2 Cross-game parallel-action mismatches (the original concern)

| Hat name | WWW name | Concept | Fix |
|---|---|---|---|
| `applyHatCorrect` | `applyWhoWhatWhereCorrect` | mark current correct | **Pick `Correct`** — rename Hat to `applyHatCorrect` (drop `Mark`) |
| `applyHatSkip` | `applyWhoWhatWhereSkip` | skip current | **Pick `Skip`** — rename Hat to `applyHatSkip` (drop `Clue`) |
| `applyHatShowFinalScores` | `applyWhoWhatWhereShowFinalScores` | move to final-results stage | **Pick a single verb-noun.** Recommend `applyHatShowFinalScores` + `applyWhoWhatWhereShowFinalScores` so both express "transition the match to the final-scores stage." (`ViewResults` reads as a UI action; `FinalScores` is a stage noun.) |

These also affect socket event names (`hat:markCorrect`, `hat:skipClue`,
`hat:viewResults`, `www:correct`, `www:skip`, `www:finalScores`) — **wire
format change**, so consumers of the events (client + server) must land in
the same commit. Schemas in `server/socketSchemas.ts` need keys updated
to match. See §5 for sequencing.

### 3.3 Other small mismatches

| Current | Recommended |
|---|---|
| `useWhoWhatWhereSingleplayerApp` | `useWhoWhatWhereApp` (parallel to `useHatSingleplayerApp` / `useImposterSingleplayerApp`) |
| `hatSingleplayerAppTypes.ts` | `hatAppTypes.ts` (drop `Game`, match `imposterSingleplayerAppTypes.ts`) |
| `LegacyHubPage` already renamed to `PassNPlayHubPage` in 0.15.6 ✅ | — |
| `mpDebug` (server) / `MULTIPLAYER_DEBUG` (env var) | **Keep.** `MULTIPLAYER_DEBUG` is wire-facing config; renaming touches deploy docs. |

---

## 4. What is already consistent (don't touch)

- All `start*` initiators — 7 functions, all use `start`, no synonyms.
- All server `apply*` action handlers — 17 functions, all use `apply`.
- All `build*` factories — 13 functions.
- All `load*` / `save*` / `clear*` storage helpers.
- All `<Game>MultiplayerView` components (3/3 parallel).
- All `<Game>App` top-level components (3/3, modulo `HatSingleplayerApp`'s `Game`).
- `ResultsScreen` / `FinalTurnRecapScreen` naming.
- File-case conventions (PascalCase for components, camelCase for the rest,
  kebab-case for folders).
- The wire-format `GameKind` literal union.

---

## 5. Remediation plan — sequenced into independent commits

Each step is intended to be **one commit** with a version bump and a
verification pass (`pnpm run verify` + Fallow). Stop after any step if
quota is tight; the codebase is consistent at every boundary.

### Step N0 — Land the conventions doc + ESLint rule

- New `docs/NAMING.md` (extracted from §2 of this file).
- Add `@typescript-eslint/naming-convention` rule (§2.7).
- Wire `scripts/audit-names.mts` into `pnpm run` as `pnpm run audit:names`
  for repeatability.

Version bump: PATCH. **No symbol renames in this step.**

### Step N1 — Drop `Www`/`www` short forms in Who What Where

- 15 symbol renames + 4 file renames (see §3.1).
- One large but mechanical commit. Importers update with each symbol.
- Verify Fallow's clone count stays the same; no behavioral test changes
  expected.

Version bump: PATCH (refactor, no behavior change).

### Step N2 — Drop `Game` suffix from Hat where it's redundant

- Renames: `HatSingleplayerApp` → `HatApp`, `useHatSingleplayerApp` → `useHatApp`,
  `HatSingleplayerWebScreens` → `HatWebScreens`, `hatSingleplayerAppTypes.ts` →
  `hatAppTypes.ts`, `hatDefaults.ts` → `hatDefaults.ts`,
  `hatSound.ts` → `hatSound.ts`, `hatStorage.ts` → `hatStorage.ts`,
  `imposterStorage.ts` → `imposterStorage.ts`.
- **Keep** `HatGameSession`, `HatGameAction`, `HatGameConfig`,
  `HatGamePhaseMeta` — those types live in the domain layer and read
  better with `Game` in the name.

Version bump: PATCH.

### Step N3 — Rename `useWhoWhatWhereSingleplayerApp` → `useWhoWhatWhereApp`

- Single rename + ~15 importers in `WhoWhatWhereSingleplayerApp.tsx` and tests.
- Smallest commit.

Version bump: PATCH.

### Step N4 — Cross-game parallel-action renames (Hat ↔ WWW)

Two sub-commits — each touches one wire-format edge so they're separately
revertable:

- **N4a** — Drop verb extras on `apply` handlers (no wire change):
  `applyHatCorrect` → `applyHatCorrect`,
  `applyHatSkip` → `applyHatSkip`.
- **N4b** — Align "show final scores" action name:
  `applyHatShowFinalScores` → `applyHatShowFinalScores` and
  `applyWhoWhatWhereShowFinalScores` → `applyWhoWhatWhereShowFinalScores`.
- **N4c** (wire-format) — Rename Socket.IO events to match:
  `hat:markCorrect` → `hat:correct`, `hat:skipClue` → `hat:skip`,
  `hat:viewResults` → `hat:showFinalScores`,
  `www:finalScores` → `www:showFinalScores`.
  Touches `server/socketSchemas.ts`, `server/socketHandlers.ts`,
  `server/hatRuntime.ts`, the matching client emit calls in the multi-device
  views, and the socket smoke test. **Hosts on old servers will get
  `Invalid request.` from new clients and vice versa — schedule as a
  single deploy.**

Version bumps: PATCH for N4a + N4b, **MINOR** for N4c (wire-format
breaking).

### Step N5 — Document the M-A mode-naming decision (optional)

- Add the §2.2 decision to `docs/DECISIONS.md` as an ADR-lite entry so
  future you doesn't re-litigate "multiplayer" vs "multi-device" in code.
- No code change.

Version bump: PATCH (docs-only).

---

## 6. Out of scope for this plan

- Renaming `src/multiplayer/` → `src/multi-device/` (Option M-B). Re-open
  if you choose that path.
- Renaming any wire-format `GameKind` literal (`"hat"`, `"whowhatwhere"`,
  `"imposter"`). These are stable.
- File-case audit beyond §2.6 — already consistent.
- Server env var `MULTIPLAYER_DEBUG`. Touches deploy config; rename
  separately only if M-B is chosen.

---

## 7. Reusable tooling

- **`scripts/audit-names.mts`** — re-runnable export inventory. Walks
  `src/` + `server/` via TS compiler API; emits one JSON-Lines row per
  exported symbol. Used by this audit.
- Future: surface verb-frequency and game-tag-mismatch reports as
  `pnpm run audit:names` (Step N0).

---

## Approval gate

This plan does not need to be executed in one go. The minimum useful slice
is **Step N0** (conventions doc + ESLint rule) so new code stops adding
inconsistency. Steps N1–N4 are pure refactor and can be done one at a time
with version bumps. Step N4c is the only wire-format change and should be
batched.

When you sign off, I'll execute Step N0 first and stop for review.
