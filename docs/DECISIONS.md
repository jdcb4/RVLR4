# Decisions

Durable architecture and tooling decisions for RVLRY. ADR-lite format: each entry is dated, names the decision, the reasoning, and any rejected alternatives.

When adding a new entry, append to the bottom and keep the most recent decisions visible. Do not delete past decisions; supersede them with a new entry that links back.

## Format

```
## YYYY-MM-DD: <decision title>

**Decision:** <one sentence>

**Reasoning:** <why this won>

**Rejected alternatives:** <what else was considered and why not>

**Supersedes:** <link to a prior decision, if applicable>
```

---

## 2026-05-10: Express + Socket.IO multiplayer spine

**Decision:** Pair the existing Vite SPA with a **Node HTTP server** (**Express**) plus **Socket.IO** for authoritative room + gameplay sync; store runtime multiplayer state **only in RAM** on that process.

**Reasoning:** Matches “small self-hosted Docker/Railway app” expectations, keeps latency low for timed turns, avoids database migrations for a hobby-tier deployment, and still validates inputs via shared domain logic (`src/domain/**`).

**Rejected alternatives:** Client-authoritative P2P or WebRTC mesh — fragile NAT-wise for casual hosts; adding Postgres/SQLite upfront — unnecessary persistence surface area before usage proves it.

**Supersedes:** Earlier “client-only / lightweight hub” framing for deployments — GitHub Pages remains optional for legacy-only builds while multiplayer expects Node.

---

## 2026-05-10: Results confetti without a dependency

**Decision:** Implement **`ResultsConfetti`** as fixed-position absolutely positioned colored spans animated with Tailwind **`@keyframes confetti-fall`** (`tailwind.config.ts`). No canvas libraries or extra npm packages.

**Reasoning:** Celebration UX with zero install footprint and predictable bundle size; aligns with “client-only / lightweight hub” goals.

**Rejected alternatives:** Adding **`canvas-confetti`** or similar — extra dependency and DECISIONS overhead for a decorative effect.

---

## 2026-01-01: Scaffolded from the `client-only` preset

**Decision:** Use the `Client-only React app` defaults from the Project Initiation base.

**Reasoning:** Matches the project's expected shape (GitHub Pages, Docker). Keeps tooling consistent with other projects scaffolded from the same base, reducing context-switching and giving agents predictable structure.

**Rejected alternatives:** Alternative presets in the base were not chosen because they target different deployment shapes or backend requirements.

---

## 2026-05-10: Default `GamePanel` wrapper for game routes

**Decision:** Wrap primary game-route body content (everything inside `GameShell` below the header) in `GamePanel` for consistent card chrome. Apply across Who What Where (including settings, team roster, resume prompt, final summary, results), Imposter, and Hat Game team roster when paired with `TeamRosterSetupScreen` (`omitHeading`).

**Reasoning:** One visual language for “you are in a game flow”; aligns typography and bordered panels across titles and makes new games straightforward (see `docs/ARCHITECTURE.md`).

**Rejected alternatives:** Leaving mixed `<section>` layouts maintained divergence between setup vs turn screens; replacing `GamePanel` with Tailwind-only duplication would drift over time.

---

## 2026-05-10: Named typography tiers (`text-typ-*`)

**Decision:** Define font size, line-height, and letter-spacing as CSS variables (`--font-tier-*` on `:root`) and expose them through Tailwind as `text-typ-{tier}` utilities, with a `typography` export map in `src/typography/tiers.ts`. Components use tiers instead of raw `text-sm` / `text-xl` / `tracking-*`.

**Reasoning:** Adjusting one tier recenters every matching screen; semantic names document intent (panel title vs metric vs UI).

**Rejected alternatives:** Ad hoc Tailwind classes only — duplicated tracking/size pairings and drift between games.

---

## 2026-05-10: Semantic color tokens (`semantic-*`)

**Decision:** Keep primitive CSS variables in `src/index.css`; define blends and alpha **only** in `src/themes/default.css` as `--semantic-*` tokens; expose them through Tailwind under the `semantic` color group. Components use those utilities (`bg-semantic-*`, `border-semantic-*`) and **do not** use palette utilities with `/opacity` modifiers.

**Reasoning:** One place controls opacity math; future per-game themes can swap stylesheet layers without chasing Tailwind classes across components.

**Rejected alternatives:** Encoding `primary/40`-style classes only in components — duplicates logic and blocks algorithmic or swappable themes later.

---

## 2026-05-10: Shared landing + roster footer patterns (WWW + Hat)

**Decision:** Use **`ResumeGameCard`** for in-progress saves (resume inside the card) and **`GameShell`** footer primary for **Start game** / **Start new game** (with discard confirm). **`TeamRosterSetupScreen`** renders scroll content only; **`teamRosterAdvanceLabel`** drives footer labels on roster steps. **`ReviewTeamsPanel`** plus per-game **Next steps** cards implement the review checkpoint.

**Reasoning:** Aligns both games’ pass-and-play rhythm and removes duplicate primaries inside roster panels.

**Rejected alternatives:** WWW-only full-screen resume gate; Hat-only inline roster footer primaries.

---

## 2026-05-10: Imposter words from JSON + Theme hook (backend only)

**Decision:** Ship Imposter secret words from a bundled JSON list (`src/data/imposterWords.json`) loaded via `imposterWordList.ts`. Add `resolveImposterWordBank` in `src/domain/imposter/themeWords.ts` so a future **Theme** can filter to word subsets. Do **not** expose Theme in the UI until explicitly requested.

**Reasoning:** Keeps offline-only deployment simple; host-entered words were ruled out; the resolver gives one extension point without shipping unused controls.

**Rejected alternatives:** Inline hard-coded arrays in domain only — harder to swap for a larger asset later; letting hosts type words — out of scope for trust/simplicity.

---

## 2026-05-10: Tone.js for shared game cues

**Decision:** Use the **`tone`** package and `src/services/gameSoundEffects.ts` to play short synthesized cues (correct, skip, return skipped, 10 seconds left, time up, and result stings) consistently across games and play modes.

**Reasoning:** Consistent cross-device feedback without shipping audio asset files; the shared service keeps the multiplayer Who What Where cue patterns as the primary source while letting single-player flows use the same sounds.

**Rejected alternatives:** Bundling WAV/MP3 clips — larger repo and cache busting; Web Audio API raw oscillators — more bespoke code than needed.

---

## 2026-05-12: Naming conventions — game tokens, mode modifiers, parallel actions

**Decision:** Adopt the conventions documented in
[`docs/NAMING.md`](NAMING.md). The three load-bearing choices:

1. **Hat short form `Hat*` / `hat*`** is canonical (matches the wire-format
   `GameKind` literal `"hat"`). `HatGame*` survives only on four domain
   types where it reads more naturally: `HatGameSession`, `HatGameAction`,
   `HatGameConfig`, `HatGamePhaseMeta`. `Www*` / `www*` short forms are
   banned; long-form `WhoWhatWhere*` is canonical.
2. **`Multiplayer*` is the code modifier for the Multi-Device mode.** The
   UX label changed to "Multi-Device mode" in 0.15.x but in code we keep
   `Multiplayer*` because that's what the implementation actually is
   (networked rooms via Socket.IO). Renaming offers no semantic gain.
3. **`Singleplayer*` is a new modifier added to pass-and-play symbols** that
   have a multiplayer counterpart (per-game apps, hooks, app-type modules).
   Originally the pass-and-play side shipped first with bare names; adding
   `Singleplayer*` gives true symmetry when reading code in isolation.

**Reasoning:** the codebase has accumulated three forms for the same Hat
game, two forms for Who What Where, and asymmetric mode modifiers. Without
a documented convention, every new contributor (human or agent) picks a
form at random. Locking the conventions plus surfacing them via
`pnpm run audit:names` prevents drift; a minimal `@typescript-eslint/
naming-convention` rule (typeLike PascalCase) catches the categorical
case.

**Rejected alternatives:**

- _Canonical `HatGame_`everywhere* — would force renaming the wire-format
literal`"hat"`→`"hatGame"`, breaking the server↔client contract for
  no clarity gain.
- _Rename `Multiplayer_`→`MultiDevice*` in code* — touches `~11`
  symbols, `src/multiplayer/` folder, and the `MULTIPLAYER_DEBUG` env
  var; the wire-facing env var rename is deploy-affecting. No semantic
  gain.
- _No `Singleplayer_`modifier, just bare names on the older side* — keeps
the existing asymmetry; agents reading`WhoWhatWhereSingleplayerApp` in isolation
  can't tell which mode they're in without opening the file.

**Supersedes:** N/A — this is the first naming-conventions decision.

---

## 2026-08-09: Dev-to-main promotion pipeline

**Decision:** Use `dev` as the GitHub default and integration branch, deploy it
to Railway's `dev` environment, and deploy `main` only to Railway production
after Joe reviews and explicitly approves a `dev` -> `main` promotion.

**Reasoning:** Separating the continuously changing integration line from the
production line provides a stable review target and makes the deployed branch
for each Railway environment unambiguous. Running CI for both branches and for
pull requests targeting either branch keeps the same deterministic gate at
integration and promotion time.

**Rejected alternatives:** Continuing to develop and deploy directly from
`main` leaves no durable pre-production review line. Pointing both Railway
environments at `main` makes the dev environment an exact duplicate rather
than a promotion candidate.

**Supersedes:** The previous implicit main-only working and deployment flow.

---

## 2026-08-09: Curated game content uses validated JSON

**Decision:** Store shipped word, prompt, clue-suggestion, and generated-name
content as game-owned JSON assets in `src/data`, parsed once by lightweight
TypeScript loaders with Zod validation. Keep large assets dynamically loaded
when they are not needed for initial rendering.

**Reasoning:** The content is static, bundled, and small enough to load as
files; separating it from executable TypeScript makes editing and validation
explicit. Domain loaders provide readonly typed data to browser and server
consumers, while the Who What Where loader preserves the existing lazy chunk.

**Rejected alternatives:** Executable TypeScript arrays obscure the boundary
between content and code. Raw JSON imports with type assertions provide no
runtime integrity checks. SQLite adds browser/server integration, dependency,
and query complexity without a persistence or indexing requirement.

**Supersedes:** Generalizes the 2026-05-10 Imposter JSON decision to all
curated static game content.
