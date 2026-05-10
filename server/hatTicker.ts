import type { Server } from "socket.io";

import { getCountdownSeconds } from "@/domain/hat-game/time";

import { broadcastRoom } from "./broadcast.ts";
import { applyHatExpireTurn } from "./hatRuntime.ts";
import type { RoomStore } from "./roomStore.ts";

/** Ends Hat turns when the timed window expires (authoritative server clock). */
export function startHatTurnTicker(io: Server, store: RoomStore) {
  setInterval(() => {
    void tickExpiredHatTurns(io, store);
  }, 250);
}

async function tickExpiredHatTurns(io: Server, store: RoomStore) {
  for (const room of store.listRooms()) {
    if (room.gameKind !== "hat" || room.phase !== "playing") {
      continue;
    }

    const session = room.hatSession;

    if (!session?.activeTurn?.endsAt) {
      continue;
    }

    if (getCountdownSeconds(session.activeTurn.endsAt) > 0) {
      continue;
    }

    try {
      applyHatExpireTurn(room);
      await broadcastRoom(io, store, room.code);
    } catch {
      // Ignore races (turn already ended by player action).
    }
  }
}
