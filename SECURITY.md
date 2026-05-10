# Security

## Reporting

If you discover a security issue, do not open a public issue. Contact the maintainer directly.

## Project security rules

These rules apply to all contributors, including AI agents.

### Secrets

- Never commit secrets, API keys, tokens, certificates, or production credentials.
- Use `.env.local` for local secrets. It is gitignored.
- Validate every environment variable through a Zod schema in `src/config/env.ts` (or the equivalent path in this project) so missing or malformed values fail fast at startup.

### Dependencies

- Prefer well-maintained packages with TypeScript types.
- Document any new top-level dependency in `docs/DECISIONS.md`.
- Renovate keeps dependencies current; merge dependency PRs promptly after CI passes.

### Input handling

- Validate every external input with Zod: forms, URL params, request bodies, localStorage reads, JSON file loads, third-party API responses.
- Treat data on disk as untrusted on read: schema-validate it.

### Auth

- This project does **not** implement authentication unless the user has explicitly asked for it. Adding auth changes the security surface significantly. If a task seems to need auth, raise it with the user before implementing.

### Output handling

- Avoid `dangerouslySetInnerHTML` and `eval`-style APIs.
- Sanitize user-supplied content before rendering as HTML.

### CI and supply chain

- Do not bypass commit signing, ESLint, typecheck, or test failures.
- Do not skip Renovate PRs without reviewing the changelog.
