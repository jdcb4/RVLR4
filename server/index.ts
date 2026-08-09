import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import express from "express";
import { Server } from "socket.io";

import { startDrawNGuessTurnTicker } from "./drawnguessTicker.ts";
import { loadServerEnv } from "./env.ts";
import { startHatTurnTicker } from "./hatTicker.ts";
import { registerHealthRoute } from "./health.ts";
import { handleJsonBodyError, registerHttpRoutes } from "./httpRoutes.ts";
import { initMultiplayerDebug } from "./multiplayerDebug.ts";
import { operationalLog, RateLimitReporter, startRateLimitReporter } from "./operationalLog.ts";
import { createCorsOriginValidator } from "./originPolicy.ts";
import { startRateLimiterSweeper, TokenBucketStore } from "./rateLimiter.ts";
import { RoomStore } from "./roomStore.ts";
import { startRoomIdleSweeper } from "./roomSweep.ts";
import { securityHeaders } from "./securityHeaders.ts";
import { registerSocketHandlers } from "./socketHandlers.ts";
import { APP_VERSION } from "./version.ts";
import { startWhoWhatWhereTurnTicker } from "./whoWhatWhereTicker.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const env = loadServerEnv(process.env);
initMultiplayerDebug(env.MULTIPLAYER_DEBUG);
const store = new RoomStore();
const limiter = new TokenBucketStore();
const rateLimitReporter = new RateLimitReporter();
const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT_ID || process.env.RAILWAY_PROJECT_ID);
const security = { limiter, isRailway, rateLimitReporter };
startRateLimiterSweeper(limiter);
startRateLimitReporter(rateLimitReporter);

const app = express();
app.disable("x-powered-by");
app.use(securityHeaders);
app.use(express.json({ limit: "16kb" }));
app.use(handleJsonBodyError);

const allowedOrigins =
  env.CLIENT_ORIGINS.length > 0 ? env.CLIENT_ORIGINS : ["http://localhost:5173"];
const corsOrigin = createCorsOriginValidator(allowedOrigins);

app.use(
  cors({
    origin: corsOrigin,
  }),
);

const healthState = { shuttingDown: false };
registerHealthRoute(app, healthState, APP_VERSION);
registerHttpRoutes(app, store, security);

const clientDist = path.resolve(__dirname, "../dist");

app.use(express.static(clientDist));

app.use((request, response) => {
  if (request.path.startsWith("/api")) {
    response.status(404).send("Not found");

    return;
  }

  response.sendFile(path.join(clientDist, "index.html"));
});

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof Error && error.message === "Origin is not allowed.") {
      response.status(403).json({ error: "Origin is not allowed.", code: "INVALID_REQUEST" });

      return;
    }

    operationalLog("error", "http_error", {
      operation: "http.unhandled",
      errorClass: error instanceof Error ? error.name : "UnknownError",
    });
    response.status(500).json({ error: "Internal server error.", code: "INTERNAL_ERROR" });
  },
);

const server = http.createServer(app);

const io = new Server(server, {
  maxHttpBufferSize: 256 * 1_024,
  cors: {
    origin: corsOrigin,
  },
});

io.engine.on("connection_error", (error) => {
  operationalLog("warn", "socket_connection_error", {
    operation: "socket.handshake",
    errorClass: error instanceof Error ? error.name : "ConnectionError",
  });
});

registerSocketHandlers(io, store, security);
startWhoWhatWhereTurnTicker(io, store);
startHatTurnTicker(io, store);
startDrawNGuessTurnTicker(io, store);
startRoomIdleSweeper(io, store);

const port = env.PORT;

// Bind to all interfaces (0.0.0.0) so Docker / Railway can route traffic to the container.
// Listening only on localhost would make the service unreachable from outside the container.
server.listen(port, "0.0.0.0", () => {
  operationalLog("info", "server_started", { version: APP_VERSION, port });
  if (env.MULTIPLAYER_DEBUG) {
    console.log("[multiplayer] debug logging enabled (MULTIPLAYER_DEBUG)");
  }
});

// Graceful shutdown: Railway/Docker send SIGTERM on deploy. Without this the
// process is killed mid-match and clients see a generic disconnect. The
// `server:shuttingDown` emit gives each room a chance to surface a friendly
// banner (see src/multiplayer/useRoomChannel.ts) before the socket dies.
let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  healthState.shuttingDown = true;

  operationalLog("info", "server_shutdown", { signal, version: APP_VERSION });
  rateLimitReporter.flush();
  io.emit("server:shuttingDown");

  // Give connected clients ~500ms to receive the event before closing.
  setTimeout(() => {
    io.close(() => {
      server.close(() => {
        process.exit(0);
      });
    });
  }, 500);

  // Hard exit if anything hangs past 5s.
  setTimeout(() => {
    operationalLog("error", "server_shutdown_timeout", { operation: "shutdown" });
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
