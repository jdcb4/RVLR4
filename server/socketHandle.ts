import type { Socket } from "socket.io";

import {
  type SocketEventName,
  type SocketPayload,
  socketSchemas,
} from "@/domain/multiplayer/socketSchemas";

import type { TokenBucketStore } from "./rateLimiter.ts";
import type { Room, RoomPlayer, RoomStore } from "./roomStore.ts";
import { consumeMutationBudget, isDrawingPayloadTooLarge } from "./socketBudgets.ts";
import { readSocketRequest, reportSocketFailure } from "./socketRequest.ts";

export type { SocketAck } from "@/domain/multiplayer/protocol";

export type HandlerContext = {
  readonly socket: Socket;
  readonly store: RoomStore;
  readonly room: Room;
  readonly actor: RoomPlayer;
};

function requireActor(socket: Socket, store: RoomStore): { room: Room; actor: RoomPlayer } {
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
 * - validates `rawPayload` against the schema declared for `event` in
 *   `src/domain/multiplayer/socketSchemas.ts` (rejects with "Invalid request." on failure),
 * - looks up the actor + room from `socket.data`,
 * - awaits `fn`,
 * - acks `{ ok: true }` on success or `{ ok: false, error }` on throw.
 *
 * `fallbackErrorMessage` is what the client sees if the thrown value is not an Error.
 */
export function registerHandler<E extends SocketEventName>(
  socket: Socket,
  store: RoomStore,
  event: E,
  fallbackErrorMessage: string,
  fn: (ctx: HandlerContext, payload: SocketPayload<E>) => Promise<void> | void,
) {
  const schema = socketSchemas[event];

  socket.on(event as string, async (...args: unknown[]) => {
    const { payload: rawPayload, valid, ack } = readSocketRequest(args, event);

    try {
      const parsed = schema.safeParse(rawPayload);

      if (!valid || !parsed.success) {
        const payloadTooLarge = isDrawingPayloadTooLarge(event, rawPayload);
        ack?.({
          ok: false,
          error: payloadTooLarge ? "Request payload is too large." : "Invalid request.",
          code: payloadTooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_REQUEST",
        });

        return;
      }

      const { room, actor } = requireActor(socket, store);
      if (room.starting) throw new Error("The game is starting. Wait a moment and try again.");
      const limiter = socket.data.rateLimiter as TokenBucketStore | undefined;

      if (limiter) {
        const budget = consumeMutationBudget(limiter, socket, event, parsed.data);

        if (!budget.allowed) {
          const reporter = socket.data.rateLimitReporter as
            { record(operation: string): void } | undefined;
          reporter?.record(
            event === "drawnguess:updateDrawingDraft" || event === "drawnguess:submitDrawing"
              ? "socket.drawing_mutation"
              : "socket.general_mutation",
          );
          ack?.({
            ok: false,
            error: "Too many requests. Try again shortly.",
            code: "RATE_LIMITED",
          });

          return;
        }
      }

      await fn({ socket, store, room, actor }, parsed.data as SocketPayload<E>);
      ack?.({ ok: true });
    } catch (error) {
      reportSocketFailure(event, error);

      ack?.({
        ok: false,
        error: error instanceof Error ? error.message : fallbackErrorMessage,
      });
    }
  });
}
