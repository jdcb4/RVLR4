import type { Server } from "socket.io";

import { roomChannel } from "./broadcast.ts";
import { mpDebug } from "./multiplayerDebug.ts";
import type { RoomStore } from "./roomStore.ts";

/** No `room:sync` / tick activity for this long → room is removed. */
const ACTIVITY_TTL_MS = 30 * 60 * 1000;

/** All players marked disconnected for this long → room is removed (grace after last disconnect). */
const ALL_DISCONNECTED_GRACE_MS = 10 * 60 * 1000;

/** How often we evaluate idle rules (soft delete only: whole room, never individual players here). */
const SWEEP_INTERVAL_MS = 60 * 1000;

export function startRoomIdleSweeper(io: Server, store: RoomStore) {
  setInterval(() => {
    void sweepIdleRooms(io, store);
  }, SWEEP_INTERVAL_MS);
}

async function sweepIdleRooms(io: Server, store: RoomStore) {
  const now = Date.now();

  for (const room of store.listRooms()) {
    const code = room.code;
    const staleByActivity = now - room.lastActivityAt >= ACTIVITY_TTL_MS;

    const playerCount = room.players.size;
    const disconnectedAts = [...room.players.values()]
      .map((p) => p.disconnectedAt)
      .filter((t): t is number => t !== null);

    const everyoneDisconnected =
      playerCount > 0 && disconnectedAts.length === playerCount;

    const staleByEveryoneAway =
      everyoneDisconnected &&
      now - Math.max(...disconnectedAts) >= ALL_DISCONNECTED_GRACE_MS;

    const empty = playerCount === 0;

    if (empty || staleByActivity || staleByEveryoneAway) {
      try {
        await io.in(roomChannel(code)).disconnectSockets(true);
      } catch {
        // Best-effort cleanup; room is still removed from memory.
      }

      store.deleteRoom(code);

      mpDebug("room swept (idle)", {
        code,
        empty,
        staleByActivity,
        staleByEveryoneAway,
      });
    }
  }
}
