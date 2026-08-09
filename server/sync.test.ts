import { describe, expect, it } from "vitest";

import { RoomStore } from "./roomStore.ts";
import { buildRoomSync } from "./sync.ts";

describe("buildRoomSync lobby projections", () => {
  it("projects only the authenticated viewer's Hat clue drafts", () => {
    const store = new RoomStore();
    const { room, hostPlayer } = store.createRoom({ gameKind: "hat", hostName: "Host" });
    const { player: guest } = store.joinRoom({ code: room.code, name: "Guest" });

    room.hatClueDrafts![hostPlayer.id] = ["Host secret"];
    room.hatClueDrafts![guest.id] = ["Guest secret"];

    const hostLobby = buildRoomSync(room, hostPlayer.id).lobby;
    const guestLobby = buildRoomSync(room, guest.id).lobby;

    expect(hostLobby?.myHatClueDrafts).toEqual(["Host secret"]);
    expect(guestLobby?.myHatClueDrafts).toEqual(["Guest secret"]);
    expect(JSON.stringify(hostLobby)).not.toContain("Guest secret");
    expect(JSON.stringify(guestLobby)).not.toContain("Host secret");
    expect(hostLobby).not.toHaveProperty("hatClueDrafts");
  });

  it("projects the same private Hat row after reconnect sync", () => {
    const store = new RoomStore();
    const { room, hostPlayer } = store.createRoom({ gameKind: "hat", hostName: "Host" });
    room.hatClueDrafts![hostPlayer.id] = ["Reconnect-safe secret"];

    expect(buildRoomSync(room, hostPlayer.id).lobby?.myHatClueDrafts).toEqual([
      "Reconnect-safe secret",
    ]);
  });
});
