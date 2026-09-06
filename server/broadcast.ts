import type { Server } from "socket.io";

import { prepareDrawNGuessGallerySync } from "./drawnguessGallery.ts";
import type { RoomStore } from "./roomStore.ts";
import { buildRoomSync } from "./sync.ts";

export function roomChannel(code: string) {
  return `room:${code}`;
}

export async function broadcastRoom(
  io: Server,
  store: RoomStore,
  code: string,
  onlyPlayerId?: string,
) {
  const room = store.getRoom(code);

  if (!room) {
    return;
  }

  // Any successful sync means the room state changed in a meaningful way — keep idle TTL fresh.
  store.touchRoomActivity(code);

  const sockets = await io.in(roomChannel(code)).fetchSockets();

  for (const socket of sockets) {
    const playerId = socket.data.playerId as string | undefined;

    if (!playerId || socket.data.roomCode !== code || !room.players.has(playerId)) {
      await socket.leave(roomChannel(code));
      continue;
    }

    if (onlyPlayerId && onlyPlayerId !== playerId) continue;
    let sync = buildRoomSync(room, playerId);
    if (socket.data.galleryCache === "drawnguess-v1") {
      const prepared = prepareDrawNGuessGallerySync(sync, socket.data.lastGalleryId);
      sync = prepared.sync;
      if (prepared.galleryId) socket.data.lastGalleryId = prepared.galleryId;
      else delete socket.data.lastGalleryId;
    }
    socket.emit("room:sync", sync);
  }
}
