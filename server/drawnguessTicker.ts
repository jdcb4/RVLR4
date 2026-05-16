import type { Server } from "socket.io";

import { broadcastRoom } from "./broadcast.ts";
import { applyDrawNGuessExpireTurn } from "./drawnguessRuntime.ts";
import type { Room, RoomStore } from "./roomStore.ts";

/** Advances DrawNGuess turns after the authoritative deadline plus grace window. */
export function startDrawNGuessTurnTicker(io: Server, store: RoomStore) {
  setInterval(() => {
    void tickExpiredDrawNGuessTurns(io, store);
  }, 250);
}

async function tickExpiredDrawNGuessTurns(io: Server, store: RoomStore) {
  const rooms = store.listRooms().filter(isPlayingDrawNGuessRoom);

  for (const room of rooms) {
    await expireDrawNGuessRoom(io, store, room);
  }
}

function isPlayingDrawNGuessRoom(room: Room) {
  return room.gameKind === "drawnguess" && room.phase === "playing";
}

async function expireDrawNGuessRoom(io: Server, store: RoomStore, room: Room) {
  try {
    const changed = applyDrawNGuessExpireTurn(room);

    if (changed) {
      await broadcastRoom(io, store, room.code);
    }
  } catch {
    // Ignore races with host actions or completed matches.
  }
}
