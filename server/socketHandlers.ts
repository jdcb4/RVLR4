import type { Server } from "socket.io";

import type { GameSettings } from "@/domain/whowhatwhere/types";

import { broadcastRoom, roomChannel } from "./broadcast.ts";
import { captainPlayerIdForTeam } from "./captain.ts";
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
import type { Room } from "./roomStore.ts";
import { RoomStore } from "./roomStore.ts";

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
          ack?.({ ok: true });
        } catch (error) {
          ack?.({
            ok: false,
            error: error instanceof Error ? error.message : "Unable to bind session.",
          });
        }
      },
    );

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
          startWhoWhatWhereMatch(room);
        } else if (room.gameKind === "hat") {
          startHatMatch(room);
        } else if (room.gameKind === "imposter") {
          startImposterMatch(room);
        }

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
