import { broadcastRoom } from "../broadcast.ts";
import {
  applyHatCorrect,
  applyHatEndTurn,
  applyHatReturnSkipped,
  applyHatShowFinalScores,
  applyHatSkip,
  applyHatStartTurn,
} from "../hatRuntime.ts";
import type { HandlerContext } from "../socketHandle.ts";
import { createSocketHandlerRegistrar } from "./register.ts";
import type { SocketHandlerContext } from "./types.ts";

/**
 * Registration-only composition keeps the six symmetric Hat turn commands
 * visible as one protocol; game transitions remain in hatRuntime.
 */
export function registerHatHandlers({ io, socket, store }: SocketHandlerContext) {
  const register = createSocketHandlerRegistrar({ io, socket, store });
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
