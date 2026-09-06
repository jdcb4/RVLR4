import { describe, expect, it } from "vitest";

import { createRoomBodySchema, joinRoomBodySchema, roomCodeSchema } from "./boundarySchemas.ts";

describe("HTTP boundary schemas", () => {
  it("normalizes supported room codes and display names", () => {
    expect(roomCodeSchema.parse(" ab2345 ")).toBe("AB2345");
    expect(
      createRoomBodySchema.parse({
        gameKind: "hat",
        hostName: "  Joe   Bloggs  ",
        avatarId: "frog",
      }),
    ).toEqual({ gameKind: "hat", hostName: "Joe Bloggs", avatarId: "frog" });
  });

  it.each([
    { gameKind: "unknown", hostName: "Joe" },
    { gameKind: "hat", hostName: "" },
    { gameKind: "hat", hostName: "x".repeat(33) },
    { gameKind: "hat", hostName: "Joe", avatarId: "dragon" },
    { gameKind: "hat", hostName: "Joe", unexpected: true },
  ])("rejects invalid create-room input %#", (input) => {
    expect(createRoomBodySchema.safeParse(input).success).toBe(false);
  });

  it("rejects invalid codes and strict join bodies", () => {
    expect(roomCodeSchema.safeParse("O0IL12").success).toBe(false);
    expect(joinRoomBodySchema.safeParse({ name: "Guest", unexpected: true }).success).toBe(false);
  });
});
