import { describe, expect, it } from "vitest";

import { buildRoomShareUrl } from "@/features/multiplayer/roomInvite";

describe("buildRoomShareUrl", () => {
  it("builds a join-name URL for a room code", () => {
    expect(buildRoomShareUrl("ABC123", "https://games.example/table")).toBe(
      "https://games.example/name?intent=join&code=ABC123",
    );
  });
});
