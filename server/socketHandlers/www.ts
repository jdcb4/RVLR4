import { broadcastRoom } from "../broadcast.ts";
import { createSocketHandlerRegistrar } from "./register.ts";
import {
  applyWhoWhatWhereCorrect,
  applyWhoWhatWhereEndTurn,
  applyWhoWhatWhereReturnSkipped,
  applyWhoWhatWhereRevealHint,
  applyWhoWhatWhereShowFinalScores,
  applyWhoWhatWhereSkip,
  applyWhoWhatWhereStartTurn,
  markReadyGate,
} from "../whoWhatWhereRuntime.ts";
import type { SocketHandlerContext } from "./types.ts";

export function registerWhoWhatWhereHandlers({ io, socket, store }: SocketHandlerContext) {
  const register = createSocketHandlerRegistrar({ io, socket, store });

  register("www:markReady", "Unable to update readiness.", async ({ room, actor }) => {
    const match = room.wwwMatch;
    if (!match || match.stage !== "ready")
      throw new Error("The room is not waiting on a describer.");
    const { getActiveContext } = await import("@/domain/whowhatwhere/game");
    if (getActiveContext(match).describer.id !== actor.id)
      throw new Error("Only the active describer can confirm readiness.");
    markReadyGate(room);
    await broadcastRoom(io, store, room.code);
  });
  register("www:startTurn", "Unable to start the turn.", async ({ room, actor }) => {
    const match = room.wwwMatch;
    if (!match || match.stage !== "ready") throw new Error("No turn is waiting to start.");
    const { getActiveContext } = await import("@/domain/whowhatwhere/game");
    if (getActiveContext(match).describer.id !== actor.id)
      throw new Error("Only the active describer can start the turn.");
    await applyWhoWhatWhereStartTurn(room);
    await broadcastRoom(io, store, room.code);
  });
  register("www:correct", "Unable to score that word.", async ({ room, actor }) => {
    applyWhoWhatWhereCorrect(room, actor.id);
    await broadcastRoom(io, store, room.code);
  });
  register("www:skip", "Unable to skip.", async ({ room, actor }) => {
    applyWhoWhatWhereSkip(room, actor.id);
    await broadcastRoom(io, store, room.code);
  });
  register("www:returnSkipped", "Unable to recall a skip.", async ({ room, actor }, payload) => {
    applyWhoWhatWhereReturnSkipped(room, actor.id, payload.skippedWordId);
    await broadcastRoom(io, store, room.code);
  });
  register("www:revealHint", "Unable to reveal hint.", async ({ room, actor }) => {
    applyWhoWhatWhereRevealHint(room, actor.id);
    await broadcastRoom(io, store, room.code);
  });
  register("www:endTurn", "Unable to end the turn.", async ({ room, actor }) => {
    applyWhoWhatWhereEndTurn(room, actor.id);
    await broadcastRoom(io, store, room.code);
  });
  register("www:showFinalScores", "Unable to show final scores.", async ({ room }) => {
    applyWhoWhatWhereShowFinalScores(room);
    await broadcastRoom(io, store, room.code);
  });
}
