import type { Socket } from "socket.io";
import { describe, expect, it } from "vitest";

import { TokenBucketStore } from "./rateLimiter.ts";
import {
  consumeMutationBudget,
  drawingMutationCost,
  isDrawingPayloadTooLarge,
} from "./socketBudgets.ts";

function fakeSocket(playerId: string): Socket {
  return { id: `socket-${playerId}`, data: { playerId } } as Socket;
}

describe("Socket mutation budgets", () => {
  it("keeps general budgets isolated by bound player", () => {
    const limiter = new TokenBucketStore(() => 0);
    const first = fakeSocket("first");
    const second = fakeSocket("second");

    for (let index = 0; index < 30; index += 1) {
      expect(consumeMutationBudget(limiter, first, "lobby:setReady", { ready: true }).allowed).toBe(
        true,
      );
    }

    expect(consumeMutationBudget(limiter, first, "lobby:setReady", { ready: true }).allowed).toBe(
      false,
    );
    expect(consumeMutationBudget(limiter, second, "lobby:setReady", { ready: true }).allowed).toBe(
      true,
    );
  });

  it("charges drawing payloads by serialized 64 KiB chunks", () => {
    expect(drawingMutationCost({ drawing: "x".repeat(1) })).toBe(2);
    expect(drawingMutationCost({ drawing: "x".repeat(70_000) })).toBe(3);
  });

  it("classifies oversized drawing events only", () => {
    const large = { drawing: "x".repeat(193 * 1_024) };
    expect(isDrawingPayloadTooLarge("drawnguess:updateDrawingDraft", large)).toBe(true);
    expect(isDrawingPayloadTooLarge("lobby:setReady", large)).toBe(false);
  });
});
