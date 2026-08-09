# Roadmap

Future ideas only. Roadmap entries are **not** action items.

Do not implement anything from this list unless the user explicitly asks for that feature or moves it into an active plan.

When the user mentions a future idea that is out of scope for the current task, add it here rather than implementing it opportunistically.

## Maintenance and quality

- **RM-06 — Fresh security and maintainability audit:** establish a new
  evidence-backed baseline rather than carrying forward point-in-time audit
  metrics. Review security boundaries, Socket.IO session and reconnect
  authorization, timing-safe secret comparison, validation, abuse/rate
  limiting, CORS and production configuration, dependency/supply-chain risk,
  secret handling, structured error logging, and operational health signals.
  Re-run complexity, dead-code, and duplication analysis; assess current test
  coverage; and plan targeted reductions in large hooks, reducers, socket
  handlers, and screen builders without speculative cross-game abstractions.
  Reconcile every finding with `SECURITY.md`, `ARCHITECTURE.md`, current code,
  and tests, then sequence only verified remaining work into independently
  reviewable changes.
