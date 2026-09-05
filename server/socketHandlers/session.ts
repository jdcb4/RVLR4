import type { Server, Socket } from "socket.io";

import { broadcastRoom, roomChannel } from "../broadcast.ts";
import { socketClientAddress } from "../clientAddress.ts";
import { mpDebug } from "../multiplayerDebug.ts";
import { operationalLog } from "../operationalLog.ts";
import { RATE_POLICIES } from "../rateLimiter.ts";
import { archiveRoomAfterAllPlayersOptedOut, type RoomStore } from "../roomStore.ts";
import { registerHandler } from "../socketHandle.ts";
import { releaseRoomSocket } from "../socketPresence.ts";
import { readSocketRequest, reportSocketFailure } from "../socketRequest.ts";
import { sessionBindSchema } from "../socketSchemas.ts";
import type { SocketHandlerContext, SocketSecurityContext } from "./types.ts";

export function registerSocketConnectionGuard(io: Server, security: SocketSecurityContext) {
  io.use((socket, next) => {
    const address = socketClientAddress(socket, security.isRailway);
    const result = security.limiter.take(`socket:connect:${address}`, RATE_POLICIES.socketConnect);
    if (!result.allowed) {
      security.rateLimitReporter?.record("socket.connect");
      const error = new Error("Too many connection attempts. Try again shortly.");
      error.name = "RATE_LIMITED";
      (error as Error & { data?: unknown }).data = { code: "RATE_LIMITED" };
      next(error);
      return;
    }
    socket.data.rateLimiter = security.limiter;
    socket.data.rateLimitReporter = security.rateLimitReporter;
    next();
  });
}

function registerSessionBind(
  io: Server,
  socket: Socket,
  store: RoomStore,
  security: SocketSecurityContext,
) {
  let binding = false;
  socket.on("session:bind", async (...args: unknown[]) => {
    const { payload: rawPayload, valid, ack } = readSocketRequest(args, "session:bind");
    if (binding) {
      ack({ ok: false, error: "A session connection is already in progress. Try again." });
      return;
    }
    binding = true;
    try {
      const budget = security.limiter.take(`socket:bind:${socket.id}`, RATE_POLICIES.sessionBind);
      if (!budget.allowed) {
        security.rateLimitReporter?.record("socket.session_bind");
        ack?.({
          ok: false,
          error: "Too many session attempts. Try again shortly.",
          code: "RATE_LIMITED",
        });
        return;
      }
      const parsed = sessionBindSchema.safeParse(rawPayload);
      if (!valid || !parsed.success) {
        ack?.({ ok: false, error: "Missing session details.", code: "INVALID_REQUEST" });
        return;
      }
      const code = parsed.data.code.toUpperCase();
      const player = store.authenticate({
        code,
        playerId: parsed.data.playerId,
        secret: parsed.data.secret,
      });
      if (!player) throw new Error("Unable to restore this session.");
      if (socket.data.roomCode !== code || socket.data.playerId !== player.id) {
        await releaseRoomSocket(io, socket, store);
      }
      if (!socket.connected) return;
      socket.data.roomCode = code;
      socket.data.playerId = player.id;
      await socket.join(roomChannel(code));
      if (!socket.connected) {
        await releaseRoomSocket(io, socket, store);
        return;
      }
      player.disconnectedAt = null;
      const room = store.getRoom(code);
      if (room && [...room.players.values()].every((member) => member.disconnectedAt === null)) {
        delete room.replayCancelledByDisconnect;
      }
      await broadcastRoom(io, store, code);
      mpDebug("session bound", { code, playerId: player.id });
      ack?.({ ok: true });
    } catch (error) {
      reportSocketFailure("session:bind", error);
      ack?.({
        ok: false,
        error: error instanceof Error ? error.message : "Unable to bind session.",
      });
    } finally {
      binding = false;
    }
  });
}

function registerDisconnect({ io, socket, store }: SocketHandlerContext) {
  socket.on("disconnect", async () => {
    try {
      await releaseRoomSocket(io, socket, store);
    } catch (error) {
      operationalLog("error", "socket_error", {
        operation: "socket.disconnect",
        errorClass: error instanceof Error ? error.name : "UnknownError",
      });
    }
  });
}

export function registerSessionHandlers(
  context: SocketHandlerContext,
  security: SocketSecurityContext,
) {
  const { io, socket, store } = context;
  registerSessionBind(io, socket, store, security);
  registerHandler(
    socket,
    store,
    "room:optOutResume",
    "Unable to update resume state.",
    async ({ room, actor }) => {
      if (room.phase !== "playing") throw new Error("Nothing to leave right now.");
      actor.optedOutOfResume = true;
      if ([...room.players.values()].every((player) => player.optedOutOfResume)) {
        archiveRoomAfterAllPlayersOptedOut(room);
      }
      await broadcastRoom(io, store, room.code);
    },
  );
  registerDisconnect(context);
}
