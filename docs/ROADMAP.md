# Roadmap

Future ideas only. Roadmap entries are **not** action items.

Do not implement anything from this list unless the user explicitly asks for that feature or moves it into an active plan.

When the user mentions a future idea that is out of scope for the current task, add it here rather than implementing it opportunistically.

## Ideas

- **DrawNGuess word packs:** expose category and difficulty filters in lobby settings. The backend already keeps `wordPackId` and prompt metadata for this.
- **DrawNGuess sharing:** consider Web Share API support for exported books where the browser supports file sharing.

## Imported UX and engineering findings — 2026-08-09

Source: [`UX_AND_CODE_RECS_2026-08-09.md`](UX_AND_CODE_RECS_2026-08-09.md).
The report is a point-in-time review, so validate each finding against the
current code and tests before implementation.

- **ACT-01 — Re-bind multiplayer sessions after Socket.IO reconnect
  (critical):** `src/multiplayer/useRoomChannel.ts` currently emits
  `session:bind` outside `handleConnect`, so an automatically reconnected
  socket can remain unbound. Move binding into the successful connection path,
  handle missing/invalid credentials, and add a regression test covering a
  disconnect/reconnect followed by a room command.
- **ACT-02 — Friendly direct-route and not-found handling (high):** add an
  intentional route for `/games/drawnguess` that sends players into the
  multi-device host flow, plus an app-styled catch-all or safe redirect for
  unknown paths. Cover direct navigation and invalid URLs in router tests.
- **ACT-03 — Route-level code splitting (medium):** measure the current entry
  bundle, then lazy-load game and multiplayer route modules with an accessible,
  mobile-appropriate loading state. Preserve route behavior and verify that the
  initial bundle materially shrinks before accepting the added loading
  complexity.
- **ACT-04 — Verify Who What Where deck loading remains on demand (medium):**
  the current client and server already use dynamic imports for
  `words.generated.ts`, producing a separate word-data chunk. Measure initial
  network and parse behavior, remove any production-path eager import that is
  still present, and coordinate this work with the word-list storage migration
  below rather than implementing a second loader.
- **ACT-05 — Explain multiplayer start requirements (medium):** show the host
  why Start game is disabled: minimum total players, minimum players per team,
  players not ready, or ready to start. Derive the copy from the same readiness
  rules used by the server so the guidance cannot drift from enforcement.
- **ACT-06 — Standardize mobile text-input behavior (low):** audit player,
  team, Hat clue, and DrawNGuess prompt inputs for appropriate `autoCapitalize`,
  `autoComplete`, `enterKeyHint`, input mode, and spellcheck settings. Choose
  values by field purpose and add focused interaction coverage where Enter
  submits or advances.
- **ACT-07 — Reduce timer screen-reader chatter (low):** stop announcing every
  one-second timer update. Keep the visual countdown, but use a separate polite
  live region for meaningful milestones such as ten seconds remaining and time
  expiry; verify behavior across Who What Where, Hat Game, and DrawNGuess.
- **ACT-08 — Make formatting line endings deterministic (low):** reconcile the
  current Prettier `endOfLine: "lf"` policy with Windows checkouts. Evaluate a
  repository-level `.gitattributes` policy versus `endOfLine: "auto"`, then
  choose one cross-platform approach and confirm `pnpm run format:check` is
  clean without mass unrelated rewrites.

## Data and deployment direction

- **Word-list storage audit and migration:** document every shipped word or
  prompt source and its loader. Current state: Who What Where uses the large
  generated TypeScript file `src/data/words.generated.ts`; Hat Game uses
  `clueSuggestions.json`; DrawNGuess uses `drawnguessWordPrompts.json` with a
  Zod-backed TypeScript loader; Imposter uses `imposterWords.json` with a small
  TypeScript loader; name packs are also JSON. Prefer migrating the Who What
  Where data to a compact JSON asset imported through a lightweight typed and
  runtime-validated TypeScript loader. Consider SQLite only if measured size,
  querying, or indexing needs justify the extra runtime/dependency complexity,
  and record that choice in `docs/DECISIONS.md` before implementation.
- **Meaningful Railway environment names and serverless parity:** choose names
  that clearly identify RVLRY development/review and production, preserve the
  `dev` branch -> development environment and `main` -> production environment
  mapping, and enable Railway serverless/application sleeping for both. Current
  baseline: production has application sleeping enabled while development does
  not. Validate domains, variables, source branches, wake behavior, and
  deployment status after the change.
- **Railway-first deployment with optional Docker builds:** make GitHub-repo to
  Railway the primary documented deployment path. Retain the Dockerfile and a
  manual image-build option for portability, but do not build or publish Docker
  images during routine work or deploy verification unless a Docker-specific
  change is explicitly active. Reconcile `AGENTS.md`, architecture, deployment,
  verification, and package-script guidance when this item is activated.

## Maintenance and quality

- **Documentation consolidation and cleanup audit:** inventory all durable
  documents, identify their audience and ongoing value, and classify each as
  canonical, useful historical reference, content to merge elsewhere, or safe
  to delete. Extract valuable material before deleting limited-value files,
  repair inbound links, and keep `PROJECT_INDEX.md` as the concise canonical
  map. Explicitly review the historical audit/implementation guides, naming and
  Fallow plans, mode-rename plan, cross-game UX report, and this 2026-08-09
  report for duplication or stale instructions.
- **Fresh security and maintainability audit:** perform a new evidence-backed
  code-quality review focused on security boundaries, Socket.IO session and
  reconnect authorization, input validation, abuse/rate limiting, CORS and
  production configuration, dependency/supply-chain risk, and secret handling.
  Re-run complexity/dead-code/duplication analysis and plan targeted reductions
  in large hooks, reducers, socket handlers, and screen builders without broad
  speculative abstractions. Reconcile findings with
  `AUDIT_2026-05-11.md`, `AUDIT_IMPLEMENTATION_GUIDE.md`, `FALLOW_PLAN.md`,
  `NAMING_AUDIT.md`, `SECURITY.md`, and the new report: close items already
  implemented, preserve still-valid evidence, and sequence only the remaining
  work into independently verifiable changes.
