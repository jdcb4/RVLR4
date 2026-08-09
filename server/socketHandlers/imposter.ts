import { broadcastRoom } from "../broadcast.ts";
import { applyImposterDispatch } from "../imposterRuntime.ts";
import { registerHandler } from "../socketHandle.ts";
import type { SocketHandlerContext } from "./types.ts";

export function registerImposterHandlers({ io, socket, store }: SocketHandlerContext) {
  registerHandler(
    socket,
    store,
    "imposter:dispatch",
    "Unable to update Imposter round.",
    async ({ room, actor }, payload) => {
      applyImposterDispatch(room, actor.id, actor.isHost, payload);
      await broadcastRoom(io, store, room.code);
    },
  );
}
