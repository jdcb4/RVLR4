import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import express from "express";
import { Server } from "socket.io";

import { loadServerEnv } from "./env.ts";
import { startHatTurnTicker } from "./hatTicker.ts";
import { registerHttpRoutes } from "./httpRoutes.ts";
import { initMultiplayerDebug } from "./multiplayerDebug.ts";
import { RoomStore } from "./roomStore.ts";
import { startRoomIdleSweeper } from "./roomSweep.ts";
import { registerSocketHandlers } from "./socketHandlers.ts";
import { startWhoWhatWhereTurnTicker } from "./wwwTicker.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const env = loadServerEnv(process.env);
initMultiplayerDebug(env.MULTIPLAYER_DEBUG);
const store = new RoomStore();

const app = express();
app.use(express.json());

const allowedOrigins =
  env.CLIENT_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];

// Production: `loadServerEnv` guarantees `allowedOrigins.length > 0` (see env.ts
// `superRefine`). Development falls back to Vite's dev server on 5173.
// Test or local runs without CLIENT_ORIGIN refuse all browser origins — explicit
// rather than allow-any.
const corsOrigin: string[] | false =
  allowedOrigins.length > 0
    ? allowedOrigins
    : env.NODE_ENV === "development"
      ? ["http://localhost:5173"]
      : false;

app.use(
  cors({
    origin: corsOrigin,
  }),
);

registerHttpRoutes(app, store);

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
  cors: {
    origin: corsOrigin,
  },
});

registerSocketHandlers(io, store);
startWhoWhatWhereTurnTicker(io, store);
startHatTurnTicker(io, store);
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
