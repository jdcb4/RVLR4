import type { Express } from "express";

import { normalizeRoomCode } from "./codes.ts";
import type { GameKind } from "./roomStore.ts";
import { RoomStore } from "./roomStore.ts";

function parseGameKind(value: unknown): GameKind {
  if (value === "whowhatwhere" || value === "hat" || value === "imposter") {
    return value;
  }

  throw new Error("Pick a supported game.");
}

export function registerHttpRoutes(app: Express, store: RoomStore) {
  app.post("/api/rooms", (request, response) => {
    try {
      const body = request.body as { gameKind?: unknown; hostName?: unknown };
      const gameKind = parseGameKind(body.gameKind);
      const hostName =
        typeof body.hostName === "string" ? body.hostName : "Host";

      const { room, hostPlayer } = store.createRoom({ gameKind, hostName });

      response.status(201).json({
        code: room.code,
        playerId: hostPlayer.id,
        secret: hostPlayer.secret,
        gameKind: room.gameKind,
      });
    } catch (error) {
      response.status(400).json({
        error: error instanceof Error ? error.message : "Unable to create a room.",
      });
    }
  });

  app.get("/api/rooms/:code", (request, response) => {
    const summary = store.peek(request.params.code ?? "");

    if (!summary) {
      response.status(404).json({ exists: false });

      return;
    }

    response.json({
      exists: true,
      ...summary,
    });
  });

  app.post("/api/rooms/:code/join", (request, response) => {
    try {
      const code = normalizeRoomCode(request.params.code ?? "");
      const body = request.body as { name?: unknown };
      const name = typeof body.name === "string" ? body.name : "Player";

      const { room, player } = store.joinRoom({ code, name });

      response.status(200).json({
        code: room.code,
        playerId: player.id,
        secret: player.secret,
        gameKind: room.gameKind,
      });
    } catch (error) {
      response.status(400).json({
        error: error instanceof Error ? error.message : "Unable to join this room.",
      });
    }
  });
}
