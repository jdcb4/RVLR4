import type { Server } from "socket.io";

import { GAME_DEFAULTS } from "@/config/hatDefaults";
import type { GameSettings } from "@/domain/whowhatwhere/types";

import { broadcastRoom, roomChannel } from "./broadcast.ts";
import { captainPlayerIdForTeam } from "./captain.ts";
import {
  applyDrawNGuessAdvanceReveal,
  applyDrawNGuessAdvanceTurn,
  applyDrawNGuessAdvanceTurnIfComplete,
  applyDrawNGuessDrawingDraft,
  applyDrawNGuessDrawingSubmit,
  applyDrawNGuessGuessDraft,
  applyDrawNGuessGuessSubmit,
  applyDrawNGuessOpenRevealPacket,
  applyDrawNGuessPromptDraft,
  applyDrawNGuessPromptSubmit,
  canOfferDrawNGuessReplay,
  patchDrawNGuessSettings,
  startDrawNGuessMatch,
} from "./drawnguessRuntime.ts";
import { loadHatClueDraftSlot, pickSuggestedHatClue } from "./hatClues.ts";
import {
  applyHatCorrect,
  applyHatEndTurn,
  applyHatReturnSkipped,
  applyHatShowFinalScores,
  applyHatSkip,
  applyHatStartTurn,
  startHatMatch,
} from "./hatRuntime.ts";
import { applyImposterDispatch, startImposterMatch } from "./imposterRuntime.ts";
import {
  hostPatchHatPrefs,
  hostPatchImposterCounts,
  hostPatchWhoWhatWhereSettings,
  hostSetTeamCount,
  hostSetTeamName,
  movePlayerToTeam,
} from "./lobbyControl.ts";
import { assertRoomLobbyStartReady } from "./lobbyReadiness.ts";
import { mpDebug } from "./multiplayerDebug.ts";
import type { Room, RoomPlayer } from "./roomStore.ts";
import {
  archiveRoomAfterAllPlayersOptedOut,
  resetLobbyAfterReplay,
  RoomStore,
} from "./roomStore.ts";
import { registerHandler, type SocketAck } from "./socketHandle.ts";
import { sessionBindSchema } from "./socketSchemas.ts";
import {
  applyWhoWhatWhereCorrect,
  applyWhoWhatWhereEndTurn,
  applyWhoWhatWhereReturnSkipped,
  applyWhoWhatWhereRevealHint,
  applyWhoWhatWhereShowFinalScores,
  applyWhoWhatWhereSkip,
  applyWhoWhatWhereStartTurn,
  markReadyGate,
  startWhoWhatWhereMatch,
} from "./whoWhatWhereRuntime.ts";

function ensureHostCanChangeLobbySettings(room: Room, actor: RoomPlayer) {
  if (!actor.isHost) {
    throw new Error("Only the host can change settings.");
  }

  if (room.phase !== "lobby") {
    throw new Error("Settings are locked once the match begins.");
  }
}

function canOfferReplay(activeRoom: Room): boolean {
  if (activeRoom.phase !== "playing") {
    return false;
  }

  if (activeRoom.replayCancelledByDisconnect) {
    return false;
  }

  if (activeRoom.gameKind === "whowhatwhere") {
    const stage = activeRoom.wwwMatch?.stage;
    // Let the host offer replay as soon as the match is over (per-device "final scores" is local).
    return stage === "results" || stage === "finalSummary";
  }

  if (activeRoom.gameKind === "hat") {
    const stage = activeRoom.hatSession?.stage;
    return stage === "results" || stage === "finalSummary";
  }

  if (activeRoom.gameKind === "imposter") {
    return activeRoom.imposterSnapshot?.step === "results";
  }

  if (activeRoom.gameKind === "drawnguess") {
    return canOfferDrawNGuessReplay(activeRoom);
  }

  return false;
}

export function registerSocketHandlers(io: Server, store: RoomStore) {
  io.on("connection", (socket) => {
    socket.on("session:bind", async (rawPayload: unknown, ack?: SocketAck) => {
      try {
        const parsed = sessionBindSchema.safeParse(rawPayload);

        if (!parsed.success) {
          throw new Error("Missing session details.");
        }

        const code = parsed.data.code.trim();

        if (!code) {
          throw new Error("Missing session details.");
        }

        const player = store.authenticate({
          code,
          playerId: parsed.data.playerId,
          secret: parsed.data.secret,
        });

        if (!player) {
          throw new Error("Unable to restore this session.");
        }

        socket.data.roomCode = code.toUpperCase();
        socket.data.playerId = player.id;
        player.disconnectedAt = null;
        await socket.join(roomChannel(code.toUpperCase()));
        await broadcastRoom(io, store, code);
        mpDebug("session bound", { code: code.toUpperCase(), playerId: player.id });
        ack?.({ ok: true });
      } catch (error) {
        ack?.({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to bind session.",
        });
      }
    });

    registerHandler(
      socket,
      store,
      "room:optOutResume",
      "Unable to update resume state.",
      async ({ room, actor }) => {
        if (room.phase !== "playing") {
          throw new Error("Nothing to leave right now.");
        }

        actor.optedOutOfResume = true;

        const everyoneLeftForHub = [...room.players.values()].every(
          (player) => player.optedOutOfResume,
        );

        if (everyoneLeftForHub) {
          archiveRoomAfterAllPlayersOptedOut(room);
        }

        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "lobby:setReady",
      "Unable to update ready state.",
      async ({ room, actor }, payload) => {
        actor.ready = Boolean(payload.ready);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "lobby:setName",
      "Unable to rename player.",
      async ({ room, actor }, payload) => {
        if (room.phase !== "lobby") {
          throw new Error("Names are locked once the match begins.");
        }

        actor.name =
          String(payload.name ?? "")
            .trim()
            .slice(0, 32) || actor.name;
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "lobby:moveSelf",
      "Unable to move teams.",
      async ({ room, actor }, payload) => {
        if (room.phase !== "lobby") {
          throw new Error("Teams are locked once the match begins.");
        }

        movePlayerToTeam({
          room,
          actorId: actor.id,
          targetPlayerId: actor.id,
          teamIndex: Number(payload.teamIndex),
          mode: "self",
        });
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "lobby:hostMovePlayer",
      "Unable to move player.",
      async ({ room, actor }, payload) => {
        if (!actor.isHost) {
          throw new Error("Only the host can assign teams.");
        }

        if (room.phase !== "lobby") {
          throw new Error("Teams are locked once the match begins.");
        }

        if (!payload.playerId) {
          throw new Error("Missing player.");
        }

        movePlayerToTeam({
          room,
          actorId: actor.id,
          targetPlayerId: payload.playerId,
          teamIndex: Number(payload.teamIndex),
          mode: "host",
        });
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "lobby:hostSetTeamCount",
      "Unable to update team count.",
      async ({ room, actor }, payload) => {
        if (!actor.isHost) {
          throw new Error("Only the host can change team counts.");
        }

        if (room.phase !== "lobby") {
          throw new Error("Team counts are locked once the match begins.");
        }

        hostSetTeamCount(room, Number(payload.teamCount));
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "lobby:hostSetTeamName",
      "Unable to rename team.",
      async ({ room, actor }, payload) => {
        if (!actor.isHost) {
          throw new Error("Only the host can rename teams.");
        }

        if (room.phase !== "lobby") {
          throw new Error("Team names are locked once the match begins.");
        }

        hostSetTeamName(room, Number(payload.teamIndex), String(payload.name ?? ""));
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "lobby:captainSetTeamName",
      "Unable to rename team.",
      async ({ room, actor }, payload) => {
        if (room.phase !== "lobby") {
          throw new Error("Team names are locked once the match begins.");
        }

        const teamIndex = Number(payload.teamIndex);
        const captainId = captainPlayerIdForTeam(room.players.values(), teamIndex);

        if (!captainId || captainId !== actor.id) {
          throw new Error("Only your team captain can rename this team.");
        }

        hostSetTeamName(room, teamIndex, String(payload.name ?? ""));
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "lobby:hostPatchWhoWhatWhereSettings",
      "Unable to update settings.",
      async ({ room, actor }, payload) => {
        ensureHostCanChangeLobbySettings(room, actor);

        // Schema is `z.unknown()` — `hostPatchWhoWhatWhereSettings` validates field-by-field internally.
        const { patch } = (payload ?? {}) as { patch?: Partial<GameSettings> };
        hostPatchWhoWhatWhereSettings(room, patch ?? {});
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "lobby:hostPatchHatPrefs",
      "Unable to update settings.",
      async ({ room, actor }, payload) => {
        ensureHostCanChangeLobbySettings(room, actor);

        // Schema is `z.unknown()` — `hostPatchHatPrefs` validates field-by-field internally.
        hostPatchHatPrefs(
          room,
          (payload ?? {}) as {
            hatTurnDurationSeconds?: number;
            hatSkipsPerTurn?: number;
          },
        );
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "lobby:hostPatchImposterCounts",
      "Unable to update counts.",
      async ({ room, actor }, payload) => {
        if (!actor.isHost) {
          throw new Error("Only the host can change roster targets.");
        }

        if (room.phase !== "lobby") {
          throw new Error("Counts are locked once the match begins.");
        }

        // Schema is `z.unknown()` — `hostPatchImposterCounts` validates field-by-field internally.
        hostPatchImposterCounts(
          room,
          (payload ?? {}) as {
            imposterPlayerCount?: number;
            imposterImposterCount?: number;
          },
        );
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "lobby:hostPatchDrawNGuessSettings",
      "Unable to update DrawNGuess settings.",
      async ({ room, actor }, payload) => {
        ensureHostCanChangeLobbySettings(room, actor);

        patchDrawNGuessSettings(room, payload as Parameters<typeof patchDrawNGuessSettings>[1]);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "lobby:startGame",
      "Unable to start the game.",
      async ({ room, actor }) => {
        if (!actor.isHost) {
          throw new Error("Only the host can start the match.");
        }

        if (room.phase !== "lobby") {
          throw new Error("This match already started.");
        }

        assertRoomLobbyStartReady(room);

        if (room.gameKind === "whowhatwhere") {
          await startWhoWhatWhereMatch(room);
        } else if (room.gameKind === "hat") {
          startHatMatch(room);
        } else if (room.gameKind === "imposter") {
          startImposterMatch(room);
        } else if (room.gameKind === "drawnguess") {
          startDrawNGuessMatch(room);
        }

        mpDebug("match started", {
          code: room.code,
          gameKind: room.gameKind,
        });

        await broadcastRoom(io, store, room.code);
      },
    );

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

    registerHandler(
      socket,
      store,
      "lobby:hatSetClueCell",
      "Unable to update clue.",
      async ({ room, actor }, payload) => {
        const { row, clueIndex } = loadHatClueDraftSlot(room, actor.id, payload.clueIndex);
        row[clueIndex] = String(payload.value ?? "").slice(0, GAME_DEFAULTS.maxClueLength);
        room.hatClueDrafts![actor.id] = row;

        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "lobby:hatSuggestClue",
      "Unable to suggest a clue.",
      async ({ room, actor }, payload) => {
        const { row, clueIndex } = loadHatClueDraftSlot(room, actor.id, payload.clueIndex);
        row[clueIndex] = pickSuggestedHatClue(room.hatClueDrafts!, Math.random);
        room.hatClueDrafts![actor.id] = row;

        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "game:hostOfferReplay",
      "Unable to offer replay.",
      async ({ room, actor }) => {
        if (!actor.isHost) {
          throw new Error("Only the host can offer a replay.");
        }

        if (!canOfferReplay(room)) {
          throw new Error("Replay is not available yet.");
        }

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
        if (!room.replayOfferActive) {
          throw new Error("The host has not offered a replay yet.");
        }

        const accepted = new Set(room.replayAcceptedPlayerIds ?? []);
        accepted.add(actor.id);
        room.replayAcceptedPlayerIds = [...accepted];

        if (room.replayAcceptedPlayerIds.length === room.players.size) {
          resetLobbyAfterReplay(room);
        }

        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "www:markReady",
      "Unable to update readiness.",
      async ({ room, actor }) => {
        const match = room.wwwMatch;

        if (!match || match.stage !== "ready") {
          throw new Error("The room is not waiting on a describer.");
        }

        const { getActiveContext } = await import("@/domain/whowhatwhere/game");

        if (getActiveContext(match).describer.id !== actor.id) {
          throw new Error("Only the active describer can confirm readiness.");
        }

        markReadyGate(room);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "www:startTurn",
      "Unable to start the turn.",
      async ({ room, actor }) => {
        const match = room.wwwMatch;

        if (!match || match.stage !== "ready") {
          throw new Error("No turn is waiting to start.");
        }

        const { getActiveContext } = await import("@/domain/whowhatwhere/game");

        if (getActiveContext(match).describer.id !== actor.id) {
          throw new Error("Only the active describer can start the turn.");
        }

        await applyWhoWhatWhereStartTurn(room);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "www:correct",
      "Unable to score that word.",
      async ({ room, actor }) => {
        applyWhoWhatWhereCorrect(room, actor.id);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(socket, store, "www:skip", "Unable to skip.", async ({ room, actor }) => {
      applyWhoWhatWhereSkip(room, actor.id);
      await broadcastRoom(io, store, room.code);
    });

    registerHandler(
      socket,
      store,
      "www:returnSkipped",
      "Unable to recall a skip.",
      async ({ room, actor }, payload) => {
        if (!payload.skippedWordId) {
          throw new Error("Missing skipped word.");
        }

        applyWhoWhatWhereReturnSkipped(room, actor.id, payload.skippedWordId);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "www:revealHint",
      "Unable to reveal hint.",
      async ({ room, actor }) => {
        applyWhoWhatWhereRevealHint(room, actor.id);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "www:endTurn",
      "Unable to end the turn.",
      async ({ room, actor }) => {
        applyWhoWhatWhereEndTurn(room, actor.id);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "www:showFinalScores",
      "Unable to show final scores.",
      async ({ room }) => {
        applyWhoWhatWhereShowFinalScores(room);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "hat:startTurn",
      "Unable to start the turn.",
      async ({ room, actor }) => {
        if (room.gameKind !== "hat" || room.phase !== "playing") {
          throw new Error("Hat Game is not in progress.");
        }

        applyHatStartTurn(room, actor.id);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "hat:endTurn",
      "Unable to end the turn.",
      async ({ room, actor }) => {
        if (room.gameKind !== "hat" || room.phase !== "playing") {
          throw new Error("Hat Game is not in progress.");
        }

        applyHatEndTurn(room, actor.id);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "hat:correct",
      "Unable to score that clue.",
      async ({ room, actor }) => {
        if (room.gameKind !== "hat" || room.phase !== "playing") {
          throw new Error("Hat Game is not in progress.");
        }

        applyHatCorrect(room, actor.id);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "hat:skip",
      "Unable to skip this clue.",
      async ({ room, actor }) => {
        if (room.gameKind !== "hat" || room.phase !== "playing") {
          throw new Error("Hat Game is not in progress.");
        }

        applyHatSkip(room, actor.id);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "hat:returnSkipped",
      "Unable to recall a skip.",
      async ({ room, actor }, payload) => {
        if (room.gameKind !== "hat" || room.phase !== "playing") {
          throw new Error("Hat Game is not in progress.");
        }

        applyHatReturnSkipped(room, actor.id, payload?.poolIndex);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "hat:showFinalScores",
      "Unable to show final scores.",
      async ({ room }) => {
        if (room.gameKind !== "hat" || room.phase !== "playing") {
          throw new Error("Hat Game is not in progress.");
        }

        applyHatShowFinalScores(room);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "drawnguess:updatePromptDraft",
      "Unable to update prompt.",
      async ({ room, actor }, payload) => {
        applyDrawNGuessPromptDraft(room, actor.id, payload.text);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "drawnguess:submitPrompt",
      "Unable to submit prompt.",
      async ({ room, actor }, payload) => {
        applyDrawNGuessPromptSubmit(room, actor.id, payload.text);
        applyDrawNGuessAdvanceTurnIfComplete(room);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "drawnguess:updateDrawingDraft",
      "Unable to update drawing.",
      async ({ room, actor }, payload) => {
        applyDrawNGuessDrawingDraft(room, actor.id, payload.drawing);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "drawnguess:submitDrawing",
      "Unable to submit drawing.",
      async ({ room, actor }, payload) => {
        applyDrawNGuessDrawingSubmit(room, actor.id, payload.drawing);
        applyDrawNGuessAdvanceTurnIfComplete(room);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "drawnguess:updateGuessDraft",
      "Unable to update guess.",
      async ({ room, actor }, payload) => {
        applyDrawNGuessGuessDraft(room, actor.id, payload.text);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "drawnguess:submitGuess",
      "Unable to submit guess.",
      async ({ room, actor }, payload) => {
        applyDrawNGuessGuessSubmit(room, actor.id, payload.text);
        applyDrawNGuessAdvanceTurnIfComplete(room);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "drawnguess:advanceTurn",
      "Unable to advance DrawNGuess turn.",
      async ({ room, actor }) => {
        applyDrawNGuessAdvanceTurn(room, actor.isHost);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "drawnguess:advanceReveal",
      "Unable to advance DrawNGuess reveal.",
      async ({ room, actor }, payload) => {
        applyDrawNGuessAdvanceReveal(room, actor.isHost, payload.direction);
        await broadcastRoom(io, store, room.code);
      },
    );

    registerHandler(
      socket,
      store,
      "drawnguess:openRevealPacket",
      "Unable to open DrawNGuess packet.",
      async ({ room, actor }, payload) => {
        applyDrawNGuessOpenRevealPacket(room, actor.isHost, payload.starterPlayerId);
        await broadcastRoom(io, store, room.code);
      },
    );

    socket.on("disconnect", async () => {
      try {
        const code = socket.data.roomCode as string | undefined;
        const playerId = socket.data.playerId as string | undefined;

        if (!code || !playerId) {
          return;
        }

        const room = store.getRoom(code);
        const player = room?.players.get(playerId);

        if (!player) {
          return;
        }

        player.disconnectedAt = Date.now();

        if (room.replayOfferActive) {
          room.replayOfferActive = undefined;
          room.replayAcceptedPlayerIds = undefined;
          room.replayCancelledByDisconnect = true;
        }

        await broadcastRoom(io, store, code);
      } catch {
        // ignore disconnect broadcast failures
      }
    });
  });
}
