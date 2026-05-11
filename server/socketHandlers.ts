import type { Server } from "socket.io";

import { GAME_DEFAULTS } from "@/config/hatGameDefaults";
import type { GameSettings } from "@/domain/whowhatwhere/types";

import { broadcastRoom, roomChannel } from "./broadcast.ts";
import { captainPlayerIdForTeam } from "./captain.ts";
import { pickSuggestedHatClue } from "./hatClues.ts";
import {
  applyHatEndTurn,
  applyHatMarkCorrect,
  applyHatReturnSkipped,
  applyHatSkipClue,
  applyHatStartTurn,
  applyHatViewResults,
  startHatMatch,
} from "./hatRuntime.ts";
import {
  applyImposterDispatch,
  type ImposterDispatchAction,
  startImposterMatch,
} from "./imposterRuntime.ts";
import {
  hostPatchHatPrefs,
  hostPatchImposterCounts,
  hostPatchWwwSettings,
  hostSetTeamCount,
  hostSetTeamName,
  movePlayerToTeam,
} from "./lobbyControl.ts";
import { mpDebug } from "./multiplayerDebug.ts";
import type { Room } from "./roomStore.ts";
import {
  archiveRoomAfterAllPlayersOptedOut,
  resetLobbyAfterReplay,
  RoomStore,
} from "./roomStore.ts";
import {
  applyWhoWhatWhereCorrect,
  applyWhoWhatWhereEndTurn,
  applyWhoWhatWhereFinalScores,
  applyWhoWhatWhereReturnSkipped,
  applyWhoWhatWhereSkip,
  applyWhoWhatWhereStartTurn,
  markReadyGate,
  startWhoWhatWhereMatch,
} from "./wwwRuntime.ts";

type SocketAck = (payload?: { ok?: boolean; error?: string }) => void;

function ensureLobbyEveryoneReady(room: Room) {
  for (const player of room.players.values()) {
    if (player.isHost) {
      continue;
    }

    if (!player.ready) {
      throw new Error("Waiting for everyone to ready up.");
    }
  }
}

export function registerSocketHandlers(io: Server, store: RoomStore) {
  io.on("connection", (socket) => {
    socket.on(
      "session:bind",
      async (
        payload: { code?: string; playerId?: string; secret?: string },
        ack?: SocketAck,
      ) => {
        try {
          const code = payload.code?.trim();

          if (!code || !payload.playerId || !payload.secret) {
            throw new Error("Missing session details.");
          }

          const player = store.authenticate({
            code,
            playerId: payload.playerId,
            secret: payload.secret,
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
      },
    );

    socket.on("room:optOutResume", async (_payload: unknown, ack?: SocketAck) => {
      try {
        const { room, actor } = requireActor(socket, store);

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
        ack?.({ ok: true });
      } catch (error) {
        ack?.({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to update resume state.",
        });
      }
    });

    socket.on(
      "lobby:setReady",
      async (payload: { ready?: boolean }, ack?: SocketAck) => {
        try {
          const { room, actor } = requireActor(socket, store);
          actor.ready = Boolean(payload.ready);
          await broadcastRoom(io, store, room.code);
          ack?.({ ok: true });
        } catch (error) {
          ack?.({
            ok: false,
            error: error instanceof Error ? error.message : "Unable to update ready state.",
          });
        }
      },
    );

    socket.on(
      "lobby:setName",
      async (payload: { name?: string }, ack?: SocketAck) => {
        try {
          const { room, actor } = requireActor(socket, store);

          if (room.phase !== "lobby") {
            throw new Error("Names are locked once the match begins.");
          }

          actor.name = String(payload.name ?? "").trim().slice(0, 32) || actor.name;
          await broadcastRoom(io, store, room.code);
          ack?.({ ok: true });
        } catch (error) {
          ack?.({
            ok: false,
            error: error instanceof Error ? error.message : "Unable to rename player.",
          });
        }
      },
    );

    socket.on(
      "lobby:moveSelf",
      async (payload: { teamIndex?: number }, ack?: SocketAck) => {
        try {
          const { room, actor } = requireActor(socket, store);

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
          ack?.({ ok: true });
        } catch (error) {
          ack?.({
            ok: false,
            error: error instanceof Error ? error.message : "Unable to move teams.",
          });
        }
      },
    );

    socket.on(
      "lobby:hostMovePlayer",
      async (
        payload: { playerId?: string; teamIndex?: number },
        ack?: SocketAck,
      ) => {
        try {
          const { room, actor } = requireActor(socket, store);

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
          ack?.({ ok: true });
        } catch (error) {
          ack?.({
            ok: false,
            error: error instanceof Error ? error.message : "Unable to move player.",
          });
        }
      },
    );

    socket.on(
      "lobby:hostSetTeamCount",
      async (payload: { teamCount?: number }, ack?: SocketAck) => {
        try {
          const { room, actor } = requireActor(socket, store);

          if (!actor.isHost) {
            throw new Error("Only the host can change team counts.");
          }

          if (room.phase !== "lobby") {
            throw new Error("Team counts are locked once the match begins.");
          }

          hostSetTeamCount(room, Number(payload.teamCount));
          await broadcastRoom(io, store, room.code);
          ack?.({ ok: true });
        } catch (error) {
          ack?.({
            ok: false,
            error:
              error instanceof Error ? error.message : "Unable to update team count.",
          });
        }
      },
    );

    socket.on(
      "lobby:hostSetTeamName",
      async (
        payload: { teamIndex?: number; name?: string },
        ack?: SocketAck,
      ) => {
        try {
          const { room, actor } = requireActor(socket, store);

          if (!actor.isHost) {
            throw new Error("Only the host can rename teams.");
          }

          if (room.phase !== "lobby") {
            throw new Error("Team names are locked once the match begins.");
          }

          hostSetTeamName(room, Number(payload.teamIndex), String(payload.name ?? ""));
          await broadcastRoom(io, store, room.code);
          ack?.({ ok: true });
        } catch (error) {
          ack?.({
            ok: false,
            error: error instanceof Error ? error.message : "Unable to rename team.",
          });
        }
      },
    );

    socket.on(
      "lobby:captainSetTeamName",
      async (
        payload: { teamIndex?: number; name?: string },
        ack?: SocketAck,
      ) => {
        try {
          const { room, actor } = requireActor(socket, store);

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
          ack?.({ ok: true });
        } catch (error) {
          ack?.({
            ok: false,
            error: error instanceof Error ? error.message : "Unable to rename team.",
          });
        }
      },
    );

    socket.on(
      "lobby:hostPatchWwwSettings",
      async (payload: { patch?: Partial<GameSettings> }, ack?: SocketAck) => {
        try {
          const { room, actor } = requireActor(socket, store);

          if (!actor.isHost) {
            throw new Error("Only the host can change settings.");
          }

          if (room.phase !== "lobby") {
            throw new Error("Settings are locked once the match begins.");
          }

          hostPatchWwwSettings(room, payload.patch ?? {});
          await broadcastRoom(io, store, room.code);
          ack?.({ ok: true });
        } catch (error) {
          ack?.({
            ok: false,
            error: error instanceof Error ? error.message : "Unable to update settings.",
          });
        }
      },
    );

    socket.on(
      "lobby:hostPatchHatPrefs",
      async (
        payload: { hatTurnDurationSeconds?: number; hatSkipsPerTurn?: number },
        ack?: SocketAck,
      ) => {
        try {
          const { room, actor } = requireActor(socket, store);

          if (!actor.isHost) {
            throw new Error("Only the host can change settings.");
          }

          if (room.phase !== "lobby") {
            throw new Error("Settings are locked once the match begins.");
          }

          hostPatchHatPrefs(room, payload);
          await broadcastRoom(io, store, room.code);
          ack?.({ ok: true });
        } catch (error) {
          ack?.({
            ok: false,
            error: error instanceof Error ? error.message : "Unable to update settings.",
          });
        }
      },
    );

    socket.on(
      "lobby:hostPatchImposterCounts",
      async (
        payload: { imposterPlayerCount?: number; imposterImposterCount?: number },
        ack?: SocketAck,
      ) => {
        try {
          const { room, actor } = requireActor(socket, store);

          if (!actor.isHost) {
            throw new Error("Only the host can change roster targets.");
          }

          if (room.phase !== "lobby") {
            throw new Error("Counts are locked once the match begins.");
          }

          hostPatchImposterCounts(room, payload);
          await broadcastRoom(io, store, room.code);
          ack?.({ ok: true });
        } catch (error) {
          ack?.({
            ok: false,
            error: error instanceof Error ? error.message : "Unable to update counts.",
          });
        }
      },
    );

    socket.on("lobby:startGame", async (_payload: unknown, ack?: SocketAck) => {
      try {
        const { room, actor } = requireActor(socket, store);

        if (!actor.isHost) {
          throw new Error("Only the host can start the match.");
        }

        if (room.phase !== "lobby") {
          throw new Error("This match already started.");
        }

        ensureLobbyEveryoneReady(room);

        if (room.gameKind === "whowhatwhere") {
          await startWhoWhatWhereMatch(room);
        } else if (room.gameKind === "hat") {
          startHatMatch(room);
        } else if (room.gameKind === "imposter") {
          startImposterMatch(room);
        }

        mpDebug("match started", {
          code: room.code,
          gameKind: room.gameKind,
        });

        await broadcastRoom(io, store, room.code);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to start the game.",
        });
      }
    });

    socket.on(
      "imposter:dispatch",
      async (payload: ImposterDispatchAction, ack?: SocketAck) => {
        try {
          const { room, actor } = requireActor(socket, store);

          applyImposterDispatch(room, actor.id, actor.isHost, payload);
          await broadcastRoom(io, store, room.code);
          ack?.({ ok: true });
        } catch (error) {
          ack?.({
            ok: false,
            error:
              error instanceof Error ? error.message : "Unable to update Imposter round.",
          });
        }
      },
    );

    socket.on(
      "lobby:hatSetClueCell",
      async (
        payload: { clueIndex?: number; value?: unknown },
        ack?: SocketAck,
      ) => {
        try {
          const { room, actor } = requireActor(socket, store);

          if (room.gameKind !== "hat" || room.phase !== "lobby") {
            throw new Error("Clues can only be edited in the Hat lobby.");
          }

          const clueIndex = Number(payload.clueIndex);

          if (
            clueIndex !== clueIndex ||
            clueIndex < 0 ||
            clueIndex >= GAME_DEFAULTS.cluesPerPlayer
          ) {
            throw new Error("Invalid clue slot.");
          }

          room.hatClueDrafts ??= {};
          const row = [
            ...(room.hatClueDrafts[actor.id] ??
              Array.from({ length: GAME_DEFAULTS.cluesPerPlayer }, () => "")),
          ];
          row[clueIndex] = String(payload.value ?? "").slice(
            0,
            GAME_DEFAULTS.maxClueLength,
          );
          room.hatClueDrafts[actor.id] = row;

          await broadcastRoom(io, store, room.code);
          ack?.({ ok: true });
        } catch (error) {
          ack?.({
            ok: false,
            error:
              error instanceof Error ? error.message : "Unable to update clue.",
          });
        }
      },
    );

    socket.on(
      "lobby:hatSuggestClue",
      async (payload: { clueIndex?: number }, ack?: SocketAck) => {
        try {
          const { room, actor } = requireActor(socket, store);

          if (room.gameKind !== "hat" || room.phase !== "lobby") {
            throw new Error("Clues can only be edited in the Hat lobby.");
          }

          const clueIndex = Number(payload.clueIndex);

          if (
            clueIndex !== clueIndex ||
            clueIndex < 0 ||
            clueIndex >= GAME_DEFAULTS.cluesPerPlayer
          ) {
            throw new Error("Invalid clue slot.");
          }

          room.hatClueDrafts ??= {};
          const suggestion = pickSuggestedHatClue(room.hatClueDrafts, Math.random);
          const row = [
            ...(room.hatClueDrafts[actor.id] ??
              Array.from({ length: GAME_DEFAULTS.cluesPerPlayer }, () => "")),
          ];
          row[clueIndex] = suggestion;
          room.hatClueDrafts[actor.id] = row;

          await broadcastRoom(io, store, room.code);
          ack?.({ ok: true });
        } catch (error) {
          ack?.({
            ok: false,
            error:
              error instanceof Error ? error.message : "Unable to suggest a clue.",
          });
        }
      },
    );

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

      return false;
    }

    socket.on("game:hostOfferReplay", async (_payload: unknown, ack?: SocketAck) => {
      try {
        const { room, actor } = requireActor(socket, store);

        if (!actor.isHost) {
          throw new Error("Only the host can offer a replay.");
        }

        if (!canOfferReplay(room)) {
          throw new Error("Replay is not available yet.");
        }

        room.replayOfferActive = true;
        room.replayAcceptedPlayerIds = [actor.id];
        await broadcastRoom(io, store, room.code);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to offer replay.",
        });
      }
    });

    socket.on("game:acceptReplay", async (_payload: unknown, ack?: SocketAck) => {
      try {
        const { room, actor } = requireActor(socket, store);

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
        ack?.({ ok: true });
      } catch (error) {
        ack?.({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to accept replay.",
        });
      }
    });

    socket.on("www:markReady", async (_payload: unknown, ack?: SocketAck) => {
      try {
        const { room, actor } = requireActor(socket, store);
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
        ack?.({ ok: true });
      } catch (error) {
        ack?.({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to update readiness.",
        });
      }
    });

    socket.on("www:startTurn", async (_payload: unknown, ack?: SocketAck) => {
      try {
        const { room, actor } = requireActor(socket, store);
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
        ack?.({ ok: true });
      } catch (error) {
        ack?.({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to start the turn.",
        });
      }
    });

    socket.on("www:correct", async (_payload: unknown, ack?: SocketAck) => {
      try {
        const { room, actor } = requireActor(socket, store);
        applyWhoWhatWhereCorrect(room, actor.id);
        await broadcastRoom(io, store, room.code);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to score that word.",
        });
      }
    });

    socket.on("www:skip", async (_payload: unknown, ack?: SocketAck) => {
      try {
        const { room, actor } = requireActor(socket, store);
        applyWhoWhatWhereSkip(room, actor.id);
        await broadcastRoom(io, store, room.code);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to skip.",
        });
      }
    });

    socket.on(
      "www:returnSkipped",
      async (payload: { skippedWordId?: string }, ack?: SocketAck) => {
        try {
          const { room, actor } = requireActor(socket, store);

          if (!payload.skippedWordId) {
            throw new Error("Missing skipped word.");
          }

          applyWhoWhatWhereReturnSkipped(room, actor.id, payload.skippedWordId);
          await broadcastRoom(io, store, room.code);
          ack?.({ ok: true });
        } catch (error) {
          ack?.({
            ok: false,
            error: error instanceof Error ? error.message : "Unable to recall a skip.",
          });
        }
      },
    );

    socket.on("www:endTurn", async (_payload: unknown, ack?: SocketAck) => {
      try {
        const { room, actor } = requireActor(socket, store);
        applyWhoWhatWhereEndTurn(room, actor.id);
        await broadcastRoom(io, store, room.code);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to end the turn.",
        });
      }
    });

    socket.on("www:finalScores", async (_payload: unknown, ack?: SocketAck) => {
      try {
        const { room } = requireActor(socket, store);
        applyWhoWhatWhereFinalScores(room);
        await broadcastRoom(io, store, room.code);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to show final scores.",
        });
      }
    });

    socket.on("hat:startTurn", async (_payload: unknown, ack?: SocketAck) => {
      try {
        const { room, actor } = requireActor(socket, store);

        if (room.gameKind !== "hat" || room.phase !== "playing") {
          throw new Error("Hat Game is not in progress.");
        }

        applyHatStartTurn(room, actor.id);
        await broadcastRoom(io, store, room.code);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to start the turn.",
        });
      }
    });

    socket.on("hat:endTurn", async (_payload: unknown, ack?: SocketAck) => {
      try {
        const { room, actor } = requireActor(socket, store);

        if (room.gameKind !== "hat" || room.phase !== "playing") {
          throw new Error("Hat Game is not in progress.");
        }

        applyHatEndTurn(room, actor.id);
        await broadcastRoom(io, store, room.code);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to end the turn.",
        });
      }
    });

    socket.on("hat:markCorrect", async (_payload: unknown, ack?: SocketAck) => {
      try {
        const { room, actor } = requireActor(socket, store);

        if (room.gameKind !== "hat" || room.phase !== "playing") {
          throw new Error("Hat Game is not in progress.");
        }

        applyHatMarkCorrect(room, actor.id);
        await broadcastRoom(io, store, room.code);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to score that clue.",
        });
      }
    });

    socket.on("hat:skipClue", async (_payload: unknown, ack?: SocketAck) => {
      try {
        const { room, actor } = requireActor(socket, store);

        if (room.gameKind !== "hat" || room.phase !== "playing") {
          throw new Error("Hat Game is not in progress.");
        }

        applyHatSkipClue(room, actor.id);
        await broadcastRoom(io, store, room.code);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to skip this clue.",
        });
      }
    });

    socket.on(
      "hat:returnSkipped",
      async (payload: { poolIndex?: number }, ack?: SocketAck) => {
        try {
          const { room, actor } = requireActor(socket, store);

          if (room.gameKind !== "hat" || room.phase !== "playing") {
            throw new Error("Hat Game is not in progress.");
          }

          applyHatReturnSkipped(room, actor.id, payload?.poolIndex);
          await broadcastRoom(io, store, room.code);
          ack?.({ ok: true });
        } catch (error) {
          ack?.({
            ok: false,
            error:
              error instanceof Error ? error.message : "Unable to recall a skip.",
          });
        }
      },
    );

    socket.on("hat:viewResults", async (_payload: unknown, ack?: SocketAck) => {
      try {
        const { room } = requireActor(socket, store);

        if (room.gameKind !== "hat" || room.phase !== "playing") {
          throw new Error("Hat Game is not in progress.");
        }

        applyHatViewResults(room);
        await broadcastRoom(io, store, room.code);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({
          ok: false,
          error: error instanceof Error ? error.message : "Unable to show final scores.",
        });
      }
    });

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

function requireActor(
  socket: { data: { roomCode?: string; playerId?: string } },
  store: RoomStore,
) {
  const code = socket.data.roomCode;
  const playerId = socket.data.playerId;

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
