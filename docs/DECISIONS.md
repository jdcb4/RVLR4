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

---

## 2026-08-09: Railway is the primary deployment path

**Decision:** Deploy RVLRY from its GitHub repository to Railway using Railpack.
Keep `railway.json` as the repository-owned build/start contract. Retain the
manual portability recipe at `docker/Dockerfile`, outside Railway's root-level
Dockerfile auto-detection, and invoke it only through `pnpm run docker:build`.

**Reasoning:** GitHub branch deployments already provide the development and
production promotion flow. Railway always auto-detects a root file named
`Dockerfile`, even when config-as-code selects Railpack, so the manual recipe
must live at a non-default path. This retains a portable image option without
spending routine Railway compute on that recipe.

**Rejected alternatives:** Removing Docker entirely would discard a useful
self-hosting escape hatch. Keeping the recipe at the repository root makes
Docker the effective Railway builder. Building or publishing images on every
commit duplicates Railway's source-based build work.

**Supersedes:** Earlier guidance that treated Docker and Railway as equal deploy
targets or described Docker as the recommended self-hosted default.

---

## 2026-08-09: Helmet owns the production HTTP header baseline

**Decision:** Use `helmet@8.3.0` on the Express server with an explicit
same-origin SPA Content Security Policy; keep the policy enabled and tune its
directives when a reviewed asset or connection requirement changes.

**Reasoning:** Helmet provides a maintained baseline for CSP and related
browser security headers with less bespoke middleware. The explicit policy
permits the app's same-origin scripts, WebSocket connections, inline Tailwind
styles, and data/blob images while disabling objects and framing.

**Rejected alternatives:** Hand-maintaining every header duplicates a mature
package and is easier to drift. Disabling CSP wholesale would give up the most
useful browser-side control to avoid a small amount of configuration.

**Supersedes:** The previous implicit reliance on browser and Express defaults.

---

## 2026-08-09: Istanbul is the coverage interchange format

**Decision:** Use Vitest's Istanbul coverage adapter and emit text, HTML, and
`coverage-final.json` reports. Apply glob-specific thresholds to security and
viewer-projection modules and pass the JSON report directly to Fallow.

**Reasoning:** Both Vitest adapters can enforce thresholds, but Fallow expects
Istanbul source locations and counters. Using the matching adapter avoids a
lossy source-map conversion step and keeps one deterministic artifact for local
review and CI tooling.

**Rejected alternatives:** V8 coverage generated valid Vitest reports but its
negative source-map column offsets were rejected by Fallow's Istanbul reader.
Maintaining a sanitizing conversion script would add an unnecessary second
coverage format and could conceal mapping errors.

**Supersedes:** The previous implicit use of Vitest's V8 coverage adapter.

---

## 2026-09-05: Cuelume replaces Tone and the Hat phase recordings

**Decision:** Use `cuelume@0.2.2` through `src/services/gameSoundEffects.ts`
for all eleven game cues. Keep game event names independent of library names;
the complete mapping and playback contract are in [AUDIO.md](AUDIO.md).

**Reasoning:** The app needs short feedback cues, not a music engine. The
published MIT package has no runtime dependencies, generates sounds locally,
and lazily shares one AudioContext. Its 47,845-byte unpacked package replaces
Tone's substantially larger synthesis bundle and two recordings. Playback
requires no CDN or media downloads. Visual instructions remain authoritative.

**Rejected alternatives:** ReactSounds 1.0.30 offers a larger clip catalog, but
adds Howler and either CDN delivery or a local asset-copy workflow. Neither
benefits these eleven short cues enough to justify the extra moving parts.
Both packages and their published implementations were inspected. Sources:
[Cuelume docs](https://cuelume-site.pages.dev/docs/),
[Cuelume source](https://github.com/Danilaa1/cuelume), and
[ReactSounds source](https://github.com/e3ntity/react-sounds).

**Supersedes:** The 2026-05-10 Tone.js decision and bundled Hat phase WAVs.

---

## 2026-09-05: One protocol boundary inside the repository

**Decision:** Share room DTOs, replay state, acknowledgements, and schema-derived
event inputs under `src/domain/multiplayer`. Move Imposter state types from its
solo UI into the domain. Server handlers continue validating every request.

**Reasoning:** Separate client/server declarations had already disagreed on a
replay field. Correlated event/payload types now catch misspelled events, missing
payloads, and payloads intended for another command during the normal typecheck.
This removes repeated declarations without changing the in-memory architecture.

**Rejected alternatives:** A package, code generator, universal game engine, or
monorepo would add setup and maintenance work without serving another consumer.

---

## 2026-09-05: Reuse completed drawing galleries on opted-in connections

**Decision:** Send completed packet arrays once per Socket.IO binding, then
send their cache identity with ordinary replay/presence state. Negotiate this
additive capability so older clients still receive complete snapshots.

**Reasoning:** The dense eight-player probe produced 4.73 MB per viewer per
broadcast. Navigation is already local, but replay votes and reconnects would
otherwise retransmit unchanged drawings. A small merge boundary removes those
repeat transfers and the duplicate selected packet. Rebinding recovers a missing
cache. There is no persistence, compression dependency, or new service.

**Rejected alternatives:** Binary drawing encoding, a media service, and a
general delta-sync framework add substantially more complexity than this one
immutable, measured payload warrants. The existing stroke renderer/export stays.

## 2026-10-20: Standalone offline Android prototype

Use Capacitor 8 with React/Vite for the accepted Android conversion. Add exact
@capacitor/core, android, cli and app dependencies. The first acceptance gate is
Who What Where on Joe's Pixel 10; Hat/Imposter conversion follows that gate.
Keep the original Git remote untouched and do not deploy this branch to Railway.

Use a narrow local Android plugin with platform SQLite transactions for game
snapshots, plus keep-awake and privacy window flags. This avoids a third-party
SQLite plugin dependency while preserving a small, testable current/previous
snapshot API. Native writes acknowledge after commit; browser previews use a
separate localStorage adapter and are not evidence of native durability.
This local database stores offline saves, not multiplayer sessions.

## 2026-10-21: Lucide as the default UI icon library

**Decision:** Pin `lucide-react` 1.61.0 and use named imports for standard UI icons. Existing `Icon*` exports retain their API while rendering Lucide components. Custom Hat/Imposter/Who What Where identity symbols remain authored SVGs.

**Reasoning:** Joe requested Lucide as the default. A shared package replaces hand-maintained standard glyphs and the literal information letter with consistent SVG icons. Named imports let Vite include only used icons.

**Rejected alternatives:** Keeping a text information glyph or copying more SVG paths would retain inconsistent maintenance and appearance.

## 2026-10-22 — Standalone Android boundary

After the Pixel durability checkpoint, retire the unreachable multiplayer server/client and Draw & Guess, including Express/Socket.IO/QR dependencies and Railway/Docker tooling. Keep reusable rules, content, avatar presentation and tests. Share persistence/lifecycle/clock/UI primitives by composition; game controllers retain separate validated sessions and rules. Isolated design demos do not choose a production theme. No new dependency is introduced.

## 2026-10-22 — Independent game sessions and review studies

Hat and Imposter use their own version-1 session keys and game-owned controllers; WWW keeps its original key/payload compatibility. Generated private state commits before disclosure. Hat retains mid-turn phase changes; Imposter visibility is a foreground-only value. Shared roster/clock/subscription/history primitives eliminate presentation duplication without a universal game reducer. Retire obsolete browser/gallery code and unused nanoid after import analysis; the four independent offline studies replace the old gallery review role. Their fonts are locally bundled with license notices and they never enter the APK. Production theme selection remains pending user review.

## 22 October 2026 — Shared visual themes

Keep a single set of layouts/controllers and apply theme tokens and scoped component decoration. Classic preserves the incumbent styling; the four reviewed studies supply optional visual worlds. Local licensed fonts avoid runtime network dependencies. Store appearance in a separate validated native snapshot, committed before applying; do not mix preferences with game sessions or introduce a new storage dependency.

## 22 October 2026 — Recess Option B in production

Apply the approved Cut-Paper Playground through Recess-only CSS and explicit presentation classes. Decorative pseudo-elements provide layered surfaces without rotating text, adding image dependencies or changing gameplay. Keep category colours distinct and the current control geometry. Other themes retain their styles. The mockup remains a historical review artifact.

## 22 October 2026 — Curated shared answer catalogue

Keep the three original word JSON files as immutable archival inputs. A separate validated catalogue owns canonical answers, aliases, original source IDs, game membership, adult difficulty and ages 8–12 suitability. Sharing a referent between games uses one record; alternate names do not become extra draw-pool entries. Domain adapters project the existing word/string shapes, leaving version-1 snapshots intact. Difficulty and kids selectors remain deferred; this change prepares their content and expands current pools without introducing modes or a remote service. Naming and editorial rules live in WORD_CATALOGUE.md.

## 22 October 2026 — Content selection preferences

Use catalogue filters in game adapters, sharing one exact difficulty/kids predicate. Add independent native `app.content.v1` preference storage rather than coupling content selection to theme persistence. Default missing old game settings to All/Kids off and preserve the legacy WWW difficulty rule field. Freeze WWW pool settings at match creation; read the app preference for each new Imposter deal and Hat suggestion. Never reroll saved state or censor manual Hat input. Empty filtered pools and unreadable preferences fail visibly without widening selection. Native select controls preserve readable labels and compact settings rows at 360px. No new dependencies.

## 22 October 2026 — Separate Trivia corpus storage

Implement the approved separately versioned Trivia JSON corpus with dedicated native content storage, sharing manifest/download contracts with future word updates. Store bounded full packs as 256 KiB SQLite BLOB chunks (8 MiB maximum) in a separate database; this avoids Android CursorWindow limits and keeps session envelopes small. Native transactions use FULL synchronous commit and exact-current compare-and-swap. Validate complete payload hashes, schemas, duplicate identities and revisions before activation. Retain the last valid checkpoint when replacing corrupt content. No new dependency or network endpoint is introduced. The bundled bank remains empty until questions pass editorial review; storage approval does not approve the discovered candidate banks.

## 2026-10-22: Optional presenter-led Trivia

**Decision:** Keep Trivia visibility in the durable default-off app feature preference; hiding its picker card preserves the independent quiz session. Store optional written team answers and self-marked scores with selected question copies.

**Reasoning:** Allows release before the reviewed corpus is large enough, without coupling live sessions to content updates. Existing SQLite snapshots, React UI and domain functions need no new dependency.

**Rejected alternatives:** Route-level access controls and live question generation add no value for this low-risk offline feature. Unreviewed historical banks are not silently activated.

## 22 October 2026 — Cooperative Trivia and mixed difficulty

Trivia is a shared newspaper-style quiz: keep one optional written answer per question and remove teams, marking and scores. Store cooperative sessions as schema version 2 under `trivia.device.v2`; ignore the competitive v1 session rather than adding a migration during prerelease. Question pack version 2 and its 30-question bank are unchanged.

Use visible Easy/Medium/Hard buttons across WWW, Imposter and Trivia. Easy uses easy content only; Medium targets equal easy/medium shares; Hard targets equal shares of all three tiers. Fill shortages only within allowed tiers and existing category/Kids filters. Default new settings to Hard and interpret legacy `all` as Hard. This replaces the exact-tier selection and All dropdown decision above without adding dependencies.

## 22 October 2026 — Cooperative Trivia self-marking

Add Correct/Incorrect marks, one shared score and a scrollable question recap while keeping Trivia cooperative with no teams. Reveal-after-each mode omits answer writing; reveal-at-end mode always offers an optional shared answer field. On end-mode reveal, compare the written answer with the canonical answer and acceptable aliases after trimming, lowercasing and collapsing whitespace. Only exact matches become Correct automatically; other answers remain unmarked for the group to decide. Allow manual overrides and require a mark before advancing a revealed question. Exclude expired unshown questions from both score and recap.

Store the nullable boolean mark with each selected question in schema version 3 under `trivia.device.v3`. Ignore previous v1/v2 sessions rather than adding prerelease migrations; other game saves and question pack version 2 are unaffected. Use the existing domain, UI and native snapshot architecture without dependencies.

## 22 October 2026 — Temporary first-page settings and simpler Trivia setup

In 0.38.0, keep every game's first settings page in memory until the player advances to later setup or starts Trivia. Persist later setup and game progress with the existing game-owned controllers. Returning or resetting to the first page removes saved setup, and loading a valid older first-page snapshot cleans it up without a resume chooser. Keep failed cleanup/removal retryable through the same ordered snapshot owner. WWW, Hat and Imposter completion removes the saved game instead of writing a synthetic first-page setup; Trivia retains its completed score and recap until reset. This changes the persistence boundary without changing session schemas or resetting existing active saves.

Use headings above Trivia options, only 10/20/30-question presets, and eight category toggles plus Select all/Clear all in a three-column grid. Keep Start quiz in GameShell's fixed footer. Replace the availability count with a shortage alert only when selection is insufficient, or a category prompt when none are selected. Use explicit green/red Correct/Incorrect mark states separate from primary actions, retaining Incorrect left and Correct right. These choices simplify setup and distinguish a self-mark from navigation without changing selection, scoring or content-pack contracts. No new dependencies.


## 23 October 2026 — Android release preparation

Keep the existing Capacitor/React runtime and package ID while preparing Google Play distribution. iOS is deferred. Release AAB builds require four process-scoped upload-key variables or an explicit unsigned preparation flag; never use a debug-key fallback. The release Vite mode omits source maps and the helper refuses stale-web shortcuts for bundles. No signing secrets or release artifacts belong in git. Production key ownership/backup, publisher identity, policy hosting, audience declarations and Play testing remain release gates in `docs/release/google-play/README.md`. Local preparation does not submit or publish anything.

JavaScript/font notices are generated from installed lockfile dependencies by `pnpm export:notices`. Native transitive notices still require a separate final release audit. No new runtime dependency is introduced.

## 2026-10-23: additive public content updates

Use a shared versioned manifest at https://content.jboxgames.com/rvlry/v1/manifest.json with separate words/Trivia streams. Omission never removes records; permanent explicit ID tombstones and final-pool identity validation prevent truncation and duplicates. Native SQLite checkpoints the merged catalogue independently of saved games. WWW freezes a bounded match pool so later updates cannot change active play. See CONTENT_UPDATES.md for protocol and publishing rules.

Host approved public JSON using Cloudflare Workers Static Assets, without a backend database, auth or runtime Worker logic. Pin Wrangler 4.152.0 as deployment-only tooling; it is not included in the APK. Immutable publication baselines plus append-only reviewed batches rebuild cumulative packs reproducibly, independent of later APK source changes. Manual downloads send no gameplay data; release privacy materials now account for provider network metadata. Hosting can move behind the stable hostname without updating the APK.

Maximum-save stress coverage runs with at most four Vitest workers to avoid CPU/memory contention against full catalogue parsing; assertions and timeout limits are unchanged. Completed WWW aggregate records retain statistics, while the visible latest recap and active replay clues retain full content. This avoids unbounded duplicate history beside the frozen pool.
