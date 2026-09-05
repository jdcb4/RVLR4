import { describe, expect, it } from "vitest";

import { gameKindLabel } from "@/multiplayer/gameKindLabel";

import { readRoomEntrySession } from "./roomEntryResponse";

describe("gameKindLabel", () => {
  it("formats known multiplayer game kinds", () => {
    expect(gameKindLabel("whowhatwhere")).toBe("Who What Where");
    expect(gameKindLabel("hat")).toBe("Hat Game");
    expect(gameKindLabel("imposter")).toBe("Imposter");
    expect(gameKindLabel("custom")).toBe("custom");
  });
});

describe("readRoomEntrySession", () => {
  it("returns the session fields from a successful response", async () => {
    await expect(
      readRoomEntrySession(
        Response.json({
          gameKind: "hat",
          code: "ABC234",
          playerId: "07672d0a-8ab8-4a0d-9dc2-dad2f0f3897e",
          secret: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        }),
        "Unable to enter room.",
      ),
    ).resolves.toEqual({
      code: "ABC234",
      playerId: "07672d0a-8ab8-4a0d-9dc2-dad2f0f3897e",
      secret: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
  });

  it("throws the server error or fallback error for bad responses", async () => {
    await expect(
      readRoomEntrySession(
        Response.json({ error: "Room is full." }, { status: 400 }),
        "Unable to enter room.",
      ),
    ).rejects.toThrow("Room is full.");

    await expect(
      readRoomEntrySession(Response.json({ code: "ABC234" }), "Unable to enter room."),
    ).rejects.toThrow("Unable to enter room.");
  });
});
