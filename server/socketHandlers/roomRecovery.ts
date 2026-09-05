import { broadcastRoom, roomChannel } from "../broadcast.ts";
import {
  archiveRoomAfterAllPlayersOptedOut,
  removeLobbyGuest,
  resetLobbyAfterReplay,
} from "../roomStore.ts";
import { isPlayerConnected, releaseRoomSocket } from "../socketPresence.ts";
import { createSocketHandlerRegistrar } from "./register.ts";
import type { SocketHandlerContext } from "./types.ts";

export function registerRoomRecoveryHandlers(context: SocketHandlerContext) {
  const { io, socket, store } = context;
  const register = createSocketHandlerRegistrar(context);

  register("lobby:leave", "Unable to leave the lobby.", async ({ room, actor }) => {
    removeLobbyGuest(room, actor.id);
    // Explicit departure ends this seat in every tab using its credentials.
    const members = [...(io.sockets.adapter.rooms.get(roomChannel(room.code)) ?? [])];
    for (const id of members) {
      const other = io.sockets.sockets.get(id);
      if (other && other.id !== socket.id && other.data.playerId === actor.id) {
        other.emit("session:ended", { code: room.code });
        await releaseRoomSocket(io, other, store);
      }
    }
    await releaseRoomSocket(io, socket, store);
    await broadcastRoom(io, store, room.code);
  });

  register(
    "lobby:hostRemovePlayer",
    "Unable to remove the seat.",
    async ({ room, actor }, payload) => {
      if (!actor.isHost) throw new Error("Only the host can remove an away player.");
      if (isPlayerConnected(io, room.code, payload.playerId)) {
        throw new Error("This player is connected. They can leave using Room options.");
      }
      removeLobbyGuest(room, payload.playerId);
      await broadcastRoom(io, store, room.code);
    },
  );

  register("lobby:hostClose", "Unable to close the lobby.", async ({ room, actor }) => {
    if (!actor.isHost) throw new Error("Only the host can close the lobby.");
    if (room.phase !== "lobby") throw new Error("Return to the lobby before closing the room.");
    archiveRoomAfterAllPlayersOptedOut(room);
    await broadcastRoom(io, store, room.code);
  });

  register("room:hostReturnToLobby", "Unable to return to the lobby.", async ({ room, actor }) => {
    if (!actor.isHost) throw new Error("Only the host can return the room to the lobby.");
    if (room.phase !== "playing") throw new Error("There is no active match to end.");
    resetLobbyAfterReplay(room);
    await broadcastRoom(io, store, room.code);
  });
}
