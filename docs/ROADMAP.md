# Roadmap

Future ideas only. Roadmap entries are **not** action items.

Do not implement anything from this list unless the user explicitly asks for that feature or moves it into an active plan.

When the user mentions a future idea that is out of scope for the current task, add it here rather than implementing it opportunistically.

## Maintenance and quality

- **RM-05 — Documentation consolidation and cleanup audit:** inventory all durable
  documents, identify their audience and ongoing value, and classify each as
  canonical, useful historical reference, content to merge elsewhere, or safe
  to delete. Extract valuable material before deleting limited-value files,
  repair inbound links, and keep `PROJECT_INDEX.md` as the concise canonical
  map. Explicitly review the historical audit/implementation guides, naming and
  Fallow plans, mode-rename plan, cross-game UX report, and this 2026-08-09
  report for duplication or stale instructions.
- **RM-06 — Fresh security and maintainability audit:** perform a new evidence-backed
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
