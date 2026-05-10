/**
 * Quick runtime check that core server modules load with `@/*` path aliases
 * (same resolution as `pnpm run dev:server` / `tsx` with `server/tsconfig.json`).
 */
import "../server/roomStore.ts";
import "../server/imposterRuntime.ts";
import "../server/wwwRuntime.ts";

console.log("ok");
