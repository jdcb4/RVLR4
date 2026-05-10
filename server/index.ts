import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import express from "express";
import { Server } from "socket.io";

import { loadServerEnv } from "./env.ts";
import { startHatTurnTicker } from "./hatTicker.ts";
import { registerHttpRoutes } from "./httpRoutes.ts";
import { RoomStore } from "./roomStore.ts";
import { registerSocketHandlers } from "./socketHandlers.ts";
import { startWhoWhatWhereTurnTicker } from "./wwwTicker.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const env = loadServerEnv(process.env);
const store = new RoomStore();

const app = express();
app.use(express.json());

const allowedOrigins =
  env.CLIENT_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean) ??
  (env.NODE_ENV === "production" ? [] : ["http://localhost:5173"]);

const corsOrigin =
  allowedOrigins.length > 0 ? allowedOrigins : true;

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

const port = env.PORT;

server.listen(port, () => {
  console.log(`Multiplayer server listening on ${port}`);
});
