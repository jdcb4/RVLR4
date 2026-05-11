import type { Server } from "socket.io";

import type { RoomStore } from "./roomStore.ts";
import { buildRoomSync } from "./sync.ts";

export function roomChannel(code: string) {
  return `room:${code}`;
}

export async function broadcastRoom(io: Server, store: RoomStore, code: string) {
  const room = store.getRoom(code);

  if (!room) {
    return;
  }

  // Any successful sync means the room state changed in a meaningful way — keep idle TTL fresh.
  store.touchRoomActivity(code);

  const sockets = await io.in(roomChannel(code)).fetchSockets();

  for (const socket of sockets) {
    const playerId = socket.data.playerId as string | undefined;

    if (!playerId) {
      continue;
    }

    socket.emit("room:sync", buildRoomSync(room, playerId));
  }
}
