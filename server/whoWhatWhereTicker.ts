import type { Server } from "socket.io";

import { endTurn, isTurnExpired } from "@/domain/whowhatwhere/game";

import { broadcastRoom } from "./broadcast.ts";
import type { RoomStore } from "./roomStore.ts";

/** Advances timed Who What Where turns without trusting clients for the clock. */
export function startWhoWhatWhereTurnTicker(io: Server, store: RoomStore) {
  setInterval(() => {
    void tickExpiredTurns(io, store);
  }, 250);
}

async function tickExpiredTurns(io: Server, store: RoomStore) {
  for (const room of store.listRooms()) {
    if (room.gameKind !== "whowhatwhere" || room.phase !== "playing") {
      continue;
    }

    const match = room.wwwMatch;

    if (!match?.activeTurn) {
      continue;
    }

    if (!isTurnExpired(match.activeTurn)) {
      continue;
    }

    room.wwwMatch = endTurn(match);
    await broadcastRoom(io, store, room.code);
  }
}
