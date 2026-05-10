/**
 * Quick runtime check that `server/roomStore.ts` loads with `@/*` path aliases
 * (same resolution as `pnpm run dev:server` / `tsx` with `server/tsconfig.json`).
 */
import "../server/roomStore.ts";

console.log("ok");
