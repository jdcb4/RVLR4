import type { Server, Socket } from "socket.io";

import { broadcastRoom, roomChannel } from "./broadcast.ts";
import type { RoomStore } from "./roomStore.ts";

export function isPlayerConnected(io: Server, code: string, playerId: string): boolean {
  const members = io.sockets.adapter.rooms.get(roomChannel(code));
  return [...(members ?? [])].some((id) => {
    const other = io.sockets.sockets.get(id);
    return other?.connected && other.data.roomCode === code && other.data.playerId === playerId;
  });
}

/** Presence belongs to the player; closing one of their tabs is not a departure. */
export async function releaseRoomSocket(io: Server, socket: Socket, store: RoomStore) {
  const code = socket.data.roomCode as string | undefined;
  const playerId = socket.data.playerId as string | undefined;
  delete socket.data.roomCode;
  delete socket.data.playerId;
  delete socket.data.galleryCache;
  delete socket.data.lastGalleryId;
  if (!code || !playerId) return;

  await socket.leave(roomChannel(code));
  const room = store.getRoom(code);
  const player = room?.players.get(playerId);
  if (!room || !player) return;

  if (!isPlayerConnected(io, code, playerId)) {
    player.disconnectedAt = Date.now();
    if (room.replayOfferActive) {
      delete room.replayOfferActive;
      delete room.replayAcceptedPlayerIds;
      delete room.replayOfferId;
      room.replayCancelledByDisconnect = true;
    }
  }
  await broadcastRoom(io, store, code);
}
