import type { Express } from "express";

import { createRoomBodySchema, joinRoomBodySchema, roomParamsSchema } from "./boundarySchemas.ts";
import { mpDebug } from "./multiplayerDebug.ts";
import { RoomStore } from "./roomStore.ts";

const INVALID_REQUEST = "INVALID_REQUEST" as const;

export function registerHttpRoutes(app: Express, store: RoomStore) {
  app.post("/api/rooms", (request, response) => {
    try {
      const body = createRoomBodySchema.parse(request.body);

      const { room, hostPlayer } = store.createRoom({
        gameKind: body.gameKind,
        hostName: body.hostName,
        avatarId: body.avatarId,
      });

      mpDebug("room created", { code: room.code, gameKind: room.gameKind });

      response.status(201).json({
        code: room.code,
        playerId: hostPlayer.id,
        secret: hostPlayer.secret,
        gameKind: room.gameKind,
      });
    } catch (error) {
      response.status(400).json({
        error: error instanceof Error ? error.message : "Unable to create a room.",
        code: INVALID_REQUEST,
      });
    }
  });

  app.get("/api/rooms/:code", (request, response) => {
    const parsed = roomParamsSchema.safeParse(request.params);

    if (!parsed.success) {
      response.status(400).json({ error: "Invalid request.", code: INVALID_REQUEST });

      return;
    }

    const summary = store.peek(parsed.data.code);

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
      const { code } = roomParamsSchema.parse(request.params);
      const body = joinRoomBodySchema.parse(request.body);

      const { room, player } = store.joinRoom({ code, name: body.name, avatarId: body.avatarId });

      mpDebug("player joined", {
        code: room.code,
        gameKind: room.gameKind,
        playerCount: room.players.size,
      });

      response.status(200).json({
        code: room.code,
        playerId: player.id,
        secret: player.secret,
        gameKind: room.gameKind,
      });
    } catch (error) {
      response.status(400).json({
        error: error instanceof Error ? error.message : "Unable to join this room.",
        code: INVALID_REQUEST,
      });
    }
  });
}
