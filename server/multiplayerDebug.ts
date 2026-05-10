/**
 * Optional structured logs for multiplayer debugging.
 * Enable with env `MULTIPLAYER_DEBUG=1` or `MULTIPLAYER_DEBUG=true` (see `server/env.ts`).
 * Never log player secrets or session tokens.
 */

let enabled = false;

/** Call once at process startup after loading env. */
export function initMultiplayerDebug(isEnabled: boolean) {
  enabled = isEnabled;
}

/** Prefixes messages with `[multiplayer]` when debug mode is on; no-op otherwise. */
export function mpDebug(...parts: unknown[]) {
  if (enabled) {
    console.log("[multiplayer]", ...parts);
  }
}
