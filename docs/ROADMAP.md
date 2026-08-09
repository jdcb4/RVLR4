# Roadmap

Future ideas only. Roadmap entries are **not** action items.

Do not implement anything from this list unless the user explicitly asks for that feature or moves it into an active plan.

When the user mentions a future idea that is out of scope for the current task, add it here rather than implementing it opportunistically.

## Ideas

- **DrawNGuess word packs:** expose category and difficulty filters in lobby settings. The backend already keeps `wordPackId` and prompt metadata for this.
- **DrawNGuess sharing:** consider Web Share API support for exported books where the browser supports file sharing.

## Data and deployment direction

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
