import type { Socket } from "socket.io";

import { DRAWNGUESS_MAX_SERIALIZED_DRAWING_BYTES } from "@/domain/drawnguess/types";

import { RATE_POLICIES, type TokenBucketResult,TokenBucketStore } from "./rateLimiter.ts";
import type { SocketEventName } from "./socketSchemas.ts";

const DRAWING_EVENTS = new Set<SocketEventName>([
  "drawnguess:updateDrawingDraft",
  "drawnguess:submitDrawing",
]);

export function drawingMutationCost(payload: unknown): number {
  const bytes = Buffer.byteLength(JSON.stringify(payload) ?? "", "utf8");

  return 1 + Math.ceil(bytes / (64 * 1_024));
}

export function isDrawingPayloadTooLarge(event: SocketEventName, payload: unknown): boolean {
  return (
    DRAWING_EVENTS.has(event) &&
    Buffer.byteLength(JSON.stringify(payload) ?? "", "utf8") >
      DRAWNGUESS_MAX_SERIALIZED_DRAWING_BYTES
  );
}

export function consumeMutationBudget(
  limiter: TokenBucketStore,
  socket: Socket,
  event: SocketEventName,
  payload: unknown,
): TokenBucketResult {
  const actorKey =
    typeof socket.data.playerId === "string" ? socket.data.playerId : `socket:${socket.id}`;
  const drawing = DRAWING_EVENTS.has(event);
  const policy = drawing ? RATE_POLICIES.drawingMutation : RATE_POLICIES.generalMutation;
  const cost = drawing ? drawingMutationCost(payload) : 1;

  return limiter.take(
    `socket:mutation:${actorKey}:${drawing ? "drawing" : "general"}`,
    policy,
    cost,
  );
}
