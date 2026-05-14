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
          code: "ABC123",
          playerId: "player-1",
          secret: "secret-1",
        }),
        "Unable to enter room.",
      ),
    ).resolves.toEqual({
      code: "ABC123",
      playerId: "player-1",
      secret: "secret-1",
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
      readRoomEntrySession(Response.json({ code: "ABC123" }), "Unable to enter room."),
    ).rejects.toThrow("Unable to enter room.");
  });
});
