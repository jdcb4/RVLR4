# Versioning

This project uses `MAJOR.MINOR.PATCH`.

Version sources (must all match):

- `package.json` (root)
- any app-specific manifests if present (`app.json`, `manifest.json`, `wrangler.toml`, `electron-builder.yml`, etc.)

## Bump rules

- **PATCH** — bug fixes, small UI polish, documentation corrections that affect usage, dependency compatibility fixes, refactors with no intended behaviour change.
- **MINOR** — new features, meaningful UX changes, new settings, new screens, new integrations, new deployment capability, additive domain behaviour.
- **MAJOR** — breaking persistence/schema changes, incompatible public API changes, removed capabilities, or production release line reset.

Pre-1.0: use `MINOR` for meaningful feature milestones and `PATCH` for fixes.

## Process

Before every commit, decide whether the work changes:

- app behaviour
- user-visible UX
- deployment behaviour
- dependencies
- persistence schema
- public APIs
- usage documentation

If yes, **bump the version and update `docs/CHANGELOG.md` in the same commit**.

If no, note in the commit message that the change is version-neutral.

Do not commit feature or fix work without either a version bump or an explicit version-neutral note.
