import { GAME_DEFAULTS } from "@/config/hatDefaults";

import { broadcastRoom } from "../broadcast.ts";
import { captainPlayerIdForTeam } from "../captain.ts";
import { patchDrawNGuessSettings, startDrawNGuessMatch } from "../drawnguessRuntime.ts";
import { loadHatClueDraftSlot, pickSuggestedHatClue } from "../hatClues.ts";
import { startHatMatch } from "../hatRuntime.ts";
import { startImposterMatch } from "../imposterRuntime.ts";
import {
  hostPatchHatPrefs,
  hostPatchImposterCounts,
  hostPatchWhoWhatWhereSettings,
  hostSetTeamCount,
  hostSetTeamName,
  movePlayerToTeam,
} from "../lobbyControl.ts";
import { assertRoomLobbyStartReady } from "../lobbyReadiness.ts";
import { mpDebug } from "../multiplayerDebug.ts";
import type { Room, RoomPlayer } from "../roomStore.ts";
import { createSocketHandlerRegistrar } from "./register.ts";
import { startWhoWhatWhereMatch } from "../whoWhatWhereRuntime.ts";
import type { SocketHandlerContext } from "./types.ts";

function ensureHostCanChangeLobbySettings(room: Room, actor: RoomPlayer) {
  if (!actor.isHost) throw new Error("Only the host can change settings.");
  if (room.phase !== "lobby") throw new Error("Settings are locked once the match begins.");
}

export function registerLobbyHandlers({ io, socket, store }: SocketHandlerContext) {
  const register = createSocketHandlerRegistrar({ io, socket, store });

  register("lobby:setReady", "Unable to update ready state.", async ({ room, actor }, payload) => {
    actor.ready = payload.ready;
    await broadcastRoom(io, store, room.code);
  });
  register("lobby:setName", "Unable to rename player.", async ({ room, actor }, payload) => {
    if (room.phase !== "lobby") throw new Error("Names are locked once the match begins.");
    actor.name = payload.name;
    await broadcastRoom(io, store, room.code);
  });
  register("lobby:moveSelf", "Unable to move teams.", async ({ room, actor }, payload) => {
    if (room.phase !== "lobby") throw new Error("Teams are locked once the match begins.");
    movePlayerToTeam({
      room,
      actorId: actor.id,
      targetPlayerId: actor.id,
      teamIndex: payload.teamIndex,
      mode: "self",
    });
    await broadcastRoom(io, store, room.code);
  });
  register("lobby:hostMovePlayer", "Unable to move player.", async ({ room, actor }, payload) => {
    if (!actor.isHost) throw new Error("Only the host can assign teams.");
    if (room.phase !== "lobby") throw new Error("Teams are locked once the match begins.");
    movePlayerToTeam({
      room,
      actorId: actor.id,
      targetPlayerId: payload.playerId,
      teamIndex: payload.teamIndex,
      mode: "host",
    });
    await broadcastRoom(io, store, room.code);
  });
  register(
    "lobby:hostSetTeamCount",
    "Unable to update team count.",
    async ({ room, actor }, payload) => {
      if (!actor.isHost) throw new Error("Only the host can change team counts.");
      if (room.phase !== "lobby") throw new Error("Team counts are locked once the match begins.");
      hostSetTeamCount(room, payload.teamCount);
      await broadcastRoom(io, store, room.code);
    },
  );
  register("lobby:hostSetTeamName", "Unable to rename team.", async ({ room, actor }, payload) => {
    if (!actor.isHost) throw new Error("Only the host can rename teams.");
    if (room.phase !== "lobby") throw new Error("Team names are locked once the match begins.");
    hostSetTeamName(room, payload.teamIndex, payload.name);
    await broadcastRoom(io, store, room.code);
  });
  register(
    "lobby:captainSetTeamName",
    "Unable to rename team.",
    async ({ room, actor }, payload) => {
      if (room.phase !== "lobby") throw new Error("Team names are locked once the match begins.");
      const captainId = captainPlayerIdForTeam(room.players.values(), payload.teamIndex);
      if (!captainId || captainId !== actor.id)
        throw new Error("Only your team captain can rename this team.");
      hostSetTeamName(room, payload.teamIndex, payload.name);
      await broadcastRoom(io, store, room.code);
    },
  );
  register(
    "lobby:hostPatchWhoWhatWhereSettings",
    "Unable to update settings.",
    async ({ room, actor }, payload) => {
      ensureHostCanChangeLobbySettings(room, actor);
      hostPatchWhoWhatWhereSettings(room, payload.patch);
      await broadcastRoom(io, store, room.code);
    },
  );
  register(
    "lobby:hostPatchHatPrefs",
    "Unable to update settings.",
    async ({ room, actor }, payload) => {
      ensureHostCanChangeLobbySettings(room, actor);
      hostPatchHatPrefs(room, payload);
      await broadcastRoom(io, store, room.code);
    },
  );
  register(
    "lobby:hostPatchImposterCounts",
    "Unable to update counts.",
    async ({ room, actor }, payload) => {
      ensureHostCanChangeLobbySettings(room, actor);
      hostPatchImposterCounts(room, payload);
      await broadcastRoom(io, store, room.code);
    },
  );
  register(
    "lobby:hostPatchDrawNGuessSettings",
    "Unable to update DrawNGuess settings.",
    async ({ room, actor }, payload) => {
      ensureHostCanChangeLobbySettings(room, actor);
      patchDrawNGuessSettings(room, payload);
      await broadcastRoom(io, store, room.code);
    },
  );
  register("lobby:hatSetClueCell", "Unable to update clue.", async ({ room, actor }, payload) => {
    const { row, clueIndex } = loadHatClueDraftSlot(room, actor.id, payload.clueIndex);
    row[clueIndex] = payload.value.slice(0, GAME_DEFAULTS.maxClueLength);
    room.hatClueDrafts![actor.id] = row;
    await broadcastRoom(io, store, room.code);
  });
  register(
    "lobby:hatSuggestClue",
    "Unable to suggest a clue.",
    async ({ room, actor }, payload) => {
      const { row, clueIndex } = loadHatClueDraftSlot(room, actor.id, payload.clueIndex);
      row[clueIndex] = pickSuggestedHatClue(room.hatClueDrafts!, Math.random);
      room.hatClueDrafts![actor.id] = row;
      await broadcastRoom(io, store, room.code);
    },
  );
  register("lobby:startGame", "Unable to start the game.", async ({ room, actor }) => {
    if (!actor.isHost) throw new Error("Only the host can start the match.");
    if (room.phase !== "lobby") throw new Error("This match already started.");
    assertRoomLobbyStartReady(room);
    if (room.gameKind === "whowhatwhere") await startWhoWhatWhereMatch(room);
    else if (room.gameKind === "hat") startHatMatch(room);
    else if (room.gameKind === "imposter") startImposterMatch(room);
    else if (room.gameKind === "drawnguess") startDrawNGuessMatch(room);
    mpDebug("match started", { code: room.code, gameKind: room.gameKind });
    await broadcastRoom(io, store, room.code);
  });
}
