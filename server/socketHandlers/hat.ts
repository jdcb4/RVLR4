import { broadcastRoom } from "../broadcast.ts";
import {
  applyHatCorrect,
  applyHatEndTurn,
  applyHatReturnSkipped,
  applyHatShowFinalScores,
  applyHatSkip,
  applyHatStartTurn,
} from "../hatRuntime.ts";
import { type HandlerContext,registerHandler } from "../socketHandle.ts";
import type { SocketEventName, SocketPayload } from "../socketSchemas.ts";
import type { SocketHandlerContext } from "./types.ts";

export function registerHatHandlers({ io, socket, store }: SocketHandlerContext) {
  const register = <E extends SocketEventName>(
    event: E,
    message: string,
    handler: (context: HandlerContext, payload: SocketPayload<E>) => Promise<void> | void,
  ) => registerHandler(socket, store, event, message, handler);
  const requireActiveHat = (room: HandlerContext["room"]) => {
    if (room.gameKind !== "hat" || room.phase !== "playing") {
      throw new Error("Hat Game is not in progress.");
    }
  };

  register("hat:startTurn", "Unable to start the turn.", async ({ room, actor }) => {
    requireActiveHat(room);
    applyHatStartTurn(room, actor.id);
    await broadcastRoom(io, store, room.code);
  });
  register("hat:endTurn", "Unable to end the turn.", async ({ room, actor }) => {
    requireActiveHat(room);
    applyHatEndTurn(room, actor.id);
    await broadcastRoom(io, store, room.code);
  });
  register("hat:correct", "Unable to score that clue.", async ({ room, actor }) => {
    requireActiveHat(room);
    applyHatCorrect(room, actor.id);
    await broadcastRoom(io, store, room.code);
  });
  register("hat:skip", "Unable to skip this clue.", async ({ room, actor }) => {
    requireActiveHat(room);
    applyHatSkip(room, actor.id);
    await broadcastRoom(io, store, room.code);
  });
  register("hat:returnSkipped", "Unable to recall a skip.", async ({ room, actor }, payload) => {
    requireActiveHat(room);
    applyHatReturnSkipped(room, actor.id, payload.poolIndex);
    await broadcastRoom(io, store, room.code);
  });
  register("hat:showFinalScores", "Unable to show final scores.", async ({ room }) => {
    requireActiveHat(room);
    applyHatShowFinalScores(room);
    await broadcastRoom(io, store, room.code);
  });
}
