import type { Server, Socket } from "socket.io";

import type { RateLimitReporter } from "../operationalLog.ts";
import type { TokenBucketStore } from "../rateLimiter.ts";
import type { RoomStore } from "../roomStore.ts";

export type SocketHandlerContext = {
  readonly io: Server;
  readonly socket: Socket;
  readonly store: RoomStore;
};

export type SocketSecurityContext = {
  readonly limiter: TokenBucketStore;
  readonly isRailway: boolean;
  readonly rateLimitReporter?: RateLimitReporter;
};
