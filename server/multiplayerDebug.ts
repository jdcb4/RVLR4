/**
 * Optional structured logs for multiplayer debugging.
 * Enable with env `MULTIPLAYER_DEBUG=1` or `MULTIPLAYER_DEBUG=true` (see `server/env.ts`).
 * Never log player secrets or session tokens.
 */

import type { GameKind } from "@/domain/multiplayer/protocol";

let enabled = false;

/** Call once at process startup after loading env. */
export function initMultiplayerDebug(isEnabled: boolean) {
  enabled = isEnabled;
}

/** Prefixes messages with `[multiplayer]` when debug mode is on; no-op otherwise. */
export function mpDebug(
  event: string,
  fields: {
    gameKind?: GameKind;
    playerCount?: number;
    empty?: boolean;
    staleByActivity?: boolean;
    staleByEveryoneAway?: boolean;
  } = {},
) {
  if (enabled) {
    // Select fields at runtime too, so an accidental extra field cannot expose a room.
    const { gameKind, playerCount, empty, staleByActivity, staleByEveryoneAway } = fields;
    console.log("[multiplayer]", event, {
      gameKind,
      playerCount,
      empty,
      staleByActivity,
      staleByEveryoneAway,
    });
  }
}
