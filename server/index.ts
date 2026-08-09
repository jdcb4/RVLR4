import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import express from "express";
import { Server } from "socket.io";

import { startDrawNGuessTurnTicker } from "./drawnguessTicker.ts";
import { loadServerEnv } from "./env.ts";
import { startHatTurnTicker } from "./hatTicker.ts";
import { handleJsonBodyError, registerHttpRoutes } from "./httpRoutes.ts";
import { initMultiplayerDebug } from "./multiplayerDebug.ts";
import { startRateLimiterSweeper, TokenBucketStore } from "./rateLimiter.ts";
import { RoomStore } from "./roomStore.ts";
import { startRoomIdleSweeper } from "./roomSweep.ts";
import { registerSocketHandlers } from "./socketHandlers.ts";
import { startWhoWhatWhereTurnTicker } from "./whoWhatWhereTicker.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const env = loadServerEnv(process.env);
initMultiplayerDebug(env.MULTIPLAYER_DEBUG);
const store = new RoomStore();
const limiter = new TokenBucketStore();
const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT_ID || process.env.RAILWAY_PROJECT_ID);
const security = { limiter, isRailway };
startRateLimiterSweeper(limiter);

const app = express();
app.use(express.json({ limit: "16kb" }));
app.use(handleJsonBodyError);

const allowedOrigins =
  env.CLIENT_ORIGIN?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

/**
 * Pick the `origin` setting passed to `cors()` and Socket.IO.
 *
 * - Explicit `CLIENT_ORIGIN` → use that list (strict).
 * - Development without `CLIENT_ORIGIN` → allow Vite's dev server.
 * - Production without `CLIENT_ORIGIN` → allow-any (`true`) with a loud
 *   warning at boot. We used to fail-fast here (v0.14.4) but Railway-style
 *   deployments don't know their own public origin at container start, so
 *   refusing to boot just put the service in a crashloop. Operators can
 *   tighten by setting `CLIENT_ORIGIN` in their platform config; see
 *   `docs/DEPLOYMENT.md`.
 */
const corsOrigin: string[] | boolean =
  allowedOrigins.length > 0
    ? allowedOrigins
    : env.NODE_ENV === "development"
      ? ["http://localhost:5173"]
      : true;

if (env.NODE_ENV === "production" && allowedOrigins.length === 0) {
  console.warn(
    "[server] CLIENT_ORIGIN is not set — accepting all browser origins. " +
      "Set CLIENT_ORIGIN=https://your-host (comma-separated list allowed) " +
      "to lock CORS down. See docs/DEPLOYMENT.md.",
  );
}

app.use(
  cors({
    origin: corsOrigin,
  }),
);

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

const server = http.createServer(app);

const io = new Server(server, {
  maxHttpBufferSize: 256 * 1_024,
  cors: {
    origin: corsOrigin,
  },
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
  console.log(`Multiplayer server listening on 0.0.0.0:${port}`);
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

  console.log(`[server] received ${signal}, shutting down`);
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
    console.error("[server] shutdown timed out, forcing exit");
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
