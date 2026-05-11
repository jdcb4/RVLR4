import type { Socket } from "socket.io";

import type { Room, RoomPlayer, RoomStore } from "./roomStore.ts";

export type SocketAck = (payload?: { ok?: boolean; error?: string }) => void;

export type HandlerContext = {
  readonly socket: Socket;
  readonly store: RoomStore;
  readonly room: Room;
  readonly actor: RoomPlayer;
};

export function requireActor(
  socket: Socket,
  store: RoomStore,
): { room: Room; actor: RoomPlayer } {
  const code = socket.data.roomCode as string | undefined;
  const playerId = socket.data.playerId as string | undefined;

  if (!code || !playerId) {
    throw new Error("Join the room before sending commands.");
  }

  const room = store.getRoom(code);

  if (!room) {
    throw new Error("That room no longer exists.");
  }

  const actor = room.players.get(playerId);

  if (!actor) {
    throw new Error("Player record missing.");
  }

  return { room, actor };
}

/**
 * Registers a Socket.IO handler that:
 * - looks up the actor + room from `socket.data`,
 * - awaits `fn`,
 * - acks `{ ok: true }` on success or `{ ok: false, error }` on throw.
 *
 * `fallbackErrorMessage` is what the client sees if the thrown value is not an Error.
 */
export function registerHandler<TPayload>(
  socket: Socket,
  store: RoomStore,
  event: string,
  fallbackErrorMessage: string,
  fn: (ctx: HandlerContext, payload: TPayload) => Promise<void> | void,
) {
  socket.on(event, async (payload: TPayload, ack?: SocketAck) => {
    try {
      const { room, actor } = requireActor(socket, store);

      await fn({ socket, store, room, actor }, payload);
      ack?.({ ok: true });
    } catch (error) {
      ack?.({
        ok: false,
        error: error instanceof Error ? error.message : fallbackErrorMessage,
      });
    }
  });
}
