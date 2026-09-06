# Security

## Reporting

If you discover a security issue, do not open a public issue. Contact the maintainer directly.

## Project security rules

These rules apply to all contributors, including AI agents.

### Secrets

- Never commit secrets, API keys, tokens, certificates, or production credentials.
- Use `.env.local` for local secrets. It is gitignored.
- Validate Node environment input through `server/env.ts` so malformed values
  fail fast. The browser currently uses only Vite built-ins. Validate any future
  custom `VITE_*` configuration at its consumer; all client values are public.
- Optional **`MULTIPLAYER_DEBUG`** logs allow-listed lifecycle metadata for
  troubleshooting. It follows the same secret-free operational log boundary
  below; room codes and player identities must never be added to it.

### Dependencies

- Prefer well-maintained packages with TypeScript types.
- Document any new top-level dependency in `docs/DECISIONS.md`.
- Renovate keeps dependencies current; merge dependency PRs promptly after CI passes.
- Run `pnpm audit --prod` for every security wave and keep the deployed
  dependency graph free of known advisories. Any unavoidable advisory requires
  an explicit, documented applicability and residual-risk review.

### Input handling

- Validate every external input with Zod: forms, URL params, request bodies, localStorage reads, JSON file loads, third-party API responses.
- Treat data on disk as untrusted on read: schema-validate it.
- Keep HTTP and Socket.IO schemas strict, retain explicit body/message/drawing
  budgets, and preserve bounded per-process request/mutation token buckets.
- Enforce private game data through server viewer projections. UI visibility is
  not an authorization control.
- Reconnect secrets stay 32-character base64url values and are compared only
  with the constant-time helper after strict shape validation.

### Production transport boundary

- Production requires an exact, URL-validated `CLIENT_ORIGIN` allow-list.
  Origin-free navigation, health checks, and non-browser requests remain
  supported; supplied unlisted origins are rejected.
- Keep Helmet and the explicit same-origin CSP enabled. Any new external asset
  or connection source requires a reviewed policy change.
- Operational logs contain only allow-listed event metadata. Never log room
  codes, player identifiers or names, reconnect secrets, clues, drawings,
  request bodies, or headers.

### Auth

- This project does **not** implement authentication unless the user has explicitly asked for it. Adding auth changes the security surface significantly. If a task seems to need auth, raise it with the user before implementing.

### Output handling

- Avoid `dangerouslySetInnerHTML` and `eval`-style APIs.
- Sanitize user-supplied content before rendering as HTML.

### CI and supply chain

- Do not bypass commit signing, ESLint, typecheck, or test failures.
- Do not skip Renovate PRs without reviewing the changelog.
