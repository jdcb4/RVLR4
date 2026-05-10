# Agent Prompts

Canonical re-usable task prompts for this project. Paste any of these into a fresh agent session as a complete instruction.

These prompts assume the agent will read `AGENTS.md` and `docs/PROJECT_INDEX.md` first.

---

## Add a feature

```
Read AGENTS.md and docs/PROJECT_INDEX.md.

Feature spec:
<paste the spec>

Constraints:
- Match existing module boundaries (see docs/ARCHITECTURE.md).
- Add or update tests covering domain logic.
- Update docs (PROJECT_INDEX, ARCHITECTURE, CHANGELOG) if behaviour, structure, setup, deployment, persistence, or usage changes.
- Bump the version per docs/VERSIONING.md, or note in the commit message that the change is version-neutral.
- Run `pnpm run verify` and address every failure before claiming completion.
- Do not introduce new top-level dependencies without an entry in docs/DECISIONS.md.
- Do not implement auth.
```

---

## Fix a bug

```
Read AGENTS.md and docs/PROJECT_INDEX.md.

Bug:
<describe the symptom and reproduction>

Approach:
- Reproduce the bug with a failing test before changing production code.
- Make the smallest change that turns the failing test green.
- Do not refactor surrounding code as part of the fix unless it is part of the root cause.
- Update docs/CHANGELOG.md and bump PATCH per docs/VERSIONING.md.
- Run `pnpm run verify`.
```

---

## Cut a release

```
Read AGENTS.md, docs/VERSIONING.md, and docs/CHANGELOG.md.

Tasks:
1. Decide the version bump (MAJOR/MINOR/PATCH) based on changes since the last release.
2. Update package.json (and any other version sources listed in docs/VERSIONING.md).
3. Update docs/CHANGELOG.md with the new version section.
4. Run `pnpm run verify`.
5. Run any preset-specific deploy verification listed in docs/VERIFICATION.md.
6. Commit with message "Release vX.Y.Z" and tag the commit.
```

---

## Investigate complexity / duplication

```
Read AGENTS.md and docs/PROJECT_INDEX.md.

Run:
  pnpm dlx fallow --no-cache --format human

Then summarise:
- The five highest-signal findings.
- Whether each is a real issue, a false positive (and why), or out of scope.
- A concrete refactor plan for the real issues, ordered by ROI.

Do not make code changes. Report only.
```

---

## Add a deterministic check

```
Read AGENTS.md, docs/VERIFICATION.md, and package.json.

Add a deterministic check for:
<describe the area — schema validation, build artefact, deploy preview, etc.>

Constraints:
- Wire it into pnpm scripts.
- Document it in docs/VERIFICATION.md.
- Do not gate on it in CI yet — first prove it runs cleanly locally.
```

---

## Update documentation

```
Read AGENTS.md and the docs being updated.

The codebase has drifted from the docs in:
<describe the area>

Tasks:
- Update the relevant doc(s) to match current code.
- Remove stale entries rather than adding contradictory notes.
- Keep docs short, durable, and command-accurate.
- Note the doc update in docs/CHANGELOG.md if it affects usage.
```
