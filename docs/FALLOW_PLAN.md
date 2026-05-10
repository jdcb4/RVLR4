# Fallow remediation plan

Working list from `pnpm dlx fallow --no-cache --format human` (session start). Items are checked off as completed.

## Wave 1 — actionable hygiene

- [x] **W1-1** Remove unused devDependency `globals` (not referenced in eslint.config or source).
- [x] **W1-2** Deduplicate leaderboard construction: shared helper in `src/domain/shared/`, used by Hat Game `teamUtils` and WhoWhatWhere `game.ts` (`buildResults`).

## Wave 2 — second Fallow pass (after Wave 1)

- **Dead code / dupes:** Clean (no unused deps, no clone groups).
- **Health (complexity):** Still ~31 functions above Fallow thresholds — expected for pass-and-play orchestration (large hooks, `applyHatGameAction`, screen render helpers). Not treated as a batch refactor here; improve opportunistically when editing those areas.
- **Action:** `pnpm run fallow:hygiene` added so CI/agents can gate **dead-code + duplication** with exit 0; full `pnpm dlx fallow` remains advisory for complexity trends.

## Deferred / monitor (not blocking)

- **Optional native package:** Fallow postinstall may warn about `@fallow-cli/win32-x64-msvc`; optional binary install — environmental, not a code defect.
- **Complexity / large functions:** `applyHatGameAction` and Hat Game dispatch sounds were refactored into smaller helpers (`engine.ts`, `hatGameActionSound.ts`). Remaining Fallow health hits (large hooks, screen builders, etc.) — tackle opportunistically.

## Verification

Per `docs/VERIFICATION.md`: `pnpm run typecheck`, `pnpm test`, `pnpm run lint`, `pnpm run build` before each commit.
