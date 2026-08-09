import type { Express, NextFunction, Request, Response } from "express";

import { createRoomBodySchema, joinRoomBodySchema, roomParamsSchema } from "./boundarySchemas.ts";
import { httpClientAddress } from "./clientAddress.ts";
import { mpDebug } from "./multiplayerDebug.ts";
import type { RateLimitReporter } from "./operationalLog.ts";
import { RATE_POLICIES, type TokenBucketPolicy, TokenBucketStore } from "./rateLimiter.ts";
import { RoomStore } from "./roomStore.ts";

const INVALID_REQUEST = "INVALID_REQUEST" as const;

export type HttpSecurityContext = {
  readonly limiter: TokenBucketStore;
  readonly isRailway: boolean;
  readonly rateLimitReporter?: RateLimitReporter;
};

export function handleJsonBodyError(
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (error instanceof Error && "type" in error && error.type === "entity.too.large") {
    response
      .status(413)
      .json({ error: "Request payload is too large.", code: "PAYLOAD_TOO_LARGE" });

    return;
  }

  if (error instanceof Error && "type" in error && error.type === "entity.parse.failed") {
    response.status(400).json({ error: "Invalid request.", code: "INVALID_REQUEST" });

    return;
  }

  next(error);
}

function consumeHttpBudget(
  request: Request,
  response: Response,
  security: HttpSecurityContext,
  operation: string,
  policy: TokenBucketPolicy,
): boolean {
  const address = httpClientAddress(request, security.isRailway);
  const result = security.limiter.take(`http:${operation}:${address}`, policy);

  if (result.allowed) {
    return true;
  }

  security.rateLimitReporter?.record(`http.${operation}`);

  response.setHeader("Retry-After", Math.max(1, Math.ceil(result.retryAfterMs / 1_000)));
  response.status(429).json({
    error: "Too many requests. Try again shortly.",
    code: "RATE_LIMITED",
  });

  return false;
}

export function registerHttpRoutes(
  app: Express,
  store: RoomStore,
  security: HttpSecurityContext = { limiter: new TokenBucketStore(), isRailway: false },
) {
  app.post("/api/rooms", (request, response) => {
    if (!consumeHttpBudget(request, response, security, "create", RATE_POLICIES.createRoom)) {
      return;
    }

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
    if (!consumeHttpBudget(request, response, security, "lookup", RATE_POLICIES.roomLookup)) {
      return;
    }

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
    if (!consumeHttpBudget(request, response, security, "join", RATE_POLICIES.joinRoom)) {
      return;
    }

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
