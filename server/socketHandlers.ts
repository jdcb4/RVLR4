import type { Server } from "socket.io";

import { TokenBucketStore } from "./rateLimiter.ts";
import type { RoomStore } from "./roomStore.ts";
import { registerDrawNGuessHandlers } from "./socketHandlers/drawnguess.ts";
import { registerHatHandlers } from "./socketHandlers/hat.ts";
import { registerImposterHandlers } from "./socketHandlers/imposter.ts";
import { registerLobbyHandlers } from "./socketHandlers/lobby.ts";
import { registerReplayHandlers } from "./socketHandlers/replay.ts";
import {
  registerSessionHandlers,
  registerSocketConnectionGuard,
} from "./socketHandlers/session.ts";
import type { SocketSecurityContext } from "./socketHandlers/types.ts";
import { registerWhoWhatWhereHandlers } from "./socketHandlers/www.ts";

export type { SocketSecurityContext } from "./socketHandlers/types.ts";

const defaultSecurity = (): SocketSecurityContext => ({
  limiter: new TokenBucketStore(),
  isRailway: false,
});

export function registerSocketHandlers(
  io: Server,
  store: RoomStore,
  security: SocketSecurityContext = defaultSecurity(),
) {
  registerSocketConnectionGuard(io, security);
  io.on("connection", (socket) => {
    const context = { io, socket, store };
    registerSessionHandlers(context, security);
    registerLobbyHandlers(context);
    registerReplayHandlers(context);
    registerWhoWhatWhereHandlers(context);
    registerHatHandlers(context);
    registerImposterHandlers(context);
    registerDrawNGuessHandlers(context);
  });
}
