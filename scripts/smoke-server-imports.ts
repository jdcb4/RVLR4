/**
 * Quick runtime check that core server modules load with `@/*` path aliases.
 * Must match `pnpm run dev:server`, `pnpm start`, and the Docker CMD: always pass
 * `--tsconfig server/tsconfig.json` to `tsx` or Node treats `@/...` as an npm scope.
 */
import "../server/roomStore.ts";
import "../server/imposterRuntime.ts";
import "../server/whoWhatWhereRuntime.ts";

console.log("ok");
