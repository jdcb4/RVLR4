import { broadcastRoom } from "../broadcast.ts";
import { canOfferDrawNGuessReplay } from "../drawnguessRuntime.ts";
import type { Room } from "../roomStore.ts";
import { resetLobbyAfterReplay } from "../roomStore.ts";
import { registerHandler } from "../socketHandle.ts";
import type { SocketHandlerContext } from "./types.ts";

function canOfferReplay(room: Room): boolean {
  if (room.phase !== "playing" || room.replayCancelledByDisconnect) return false;
  if (room.gameKind === "whowhatwhere") {
    return room.wwwMatch?.stage === "results" || room.wwwMatch?.stage === "finalSummary";
  }
  if (room.gameKind === "hat") {
    return room.hatSession?.stage === "results" || room.hatSession?.stage === "finalSummary";
  }
  if (room.gameKind === "imposter") return room.imposterSnapshot?.step === "results";
  if (room.gameKind === "drawnguess") return canOfferDrawNGuessReplay(room);
  return false;
}

export function registerReplayHandlers({ io, socket, store }: SocketHandlerContext) {
  registerHandler(
    socket,
    store,
    "game:hostOfferReplay",
    "Unable to offer replay.",
    async ({ room, actor }) => {
      if (!actor.isHost) throw new Error("Only the host can offer a replay.");
      if (!canOfferReplay(room)) throw new Error("Replay is not available yet.");
      room.replayOfferActive = true;
      room.replayAcceptedPlayerIds = [actor.id];
      await broadcastRoom(io, store, room.code);
    },
  );
  registerHandler(
    socket,
    store,
    "game:acceptReplay",
    "Unable to accept replay.",
    async ({ room, actor }) => {
      if (!room.replayOfferActive) throw new Error("The host has not offered a replay yet.");
      const accepted = new Set(room.replayAcceptedPlayerIds ?? []);
      accepted.add(actor.id);
      room.replayAcceptedPlayerIds = [...accepted];
      if (room.replayAcceptedPlayerIds.length === room.players.size) resetLobbyAfterReplay(room);
      await broadcastRoom(io, store, room.code);
    },
  );
}
