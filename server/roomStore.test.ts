import { describe, expect, it } from "vitest";

import { IMPOSTER_MAX_PLAYERS } from "@/config/imposterDefaults";
import { MAX_PLAYERS_PER_TEAM } from "@/config/teamRoster";

import {
  archiveRoomAfterAllPlayersOptedOut,
  assertTeamLobbyReady,
  computeResumeEligible,
  resetLobbyAfterReplay,
  RoomStore,
} from "./roomStore.ts";

function fillImposterRoom(store: RoomStore, hostName = "Host"): string {
  const { room } = store.createRoom({ gameKind: "imposter", hostName });

  for (let index = 1; index < IMPOSTER_MAX_PLAYERS; index += 1) {
    store.joinRoom({ code: room.code, name: `P${index}` });
  }

  return room.code;
}

describe("RoomStore.createRoom", () => {
  it("creates a Who What Where lobby with the host as the only player", () => {
    const store = new RoomStore();
    const { room, hostPlayer } = store.createRoom({
      gameKind: "whowhatwhere",
      hostName: "Alice",
    });

    expect(room.gameKind).toBe("whowhatwhere");
    expect(room.phase).toBe("lobby");
    expect(room.teamCount).toBe(2);
    expect(room.teamNames).toHaveLength(2);
    expect(room.players.size).toBe(1);
    expect(hostPlayer.isHost).toBe(true);
    expect(hostPlayer.name).toBe("Alice");
    expect(hostPlayer.teamIndex).toBe(0);
    expect(hostPlayer.optedOutOfResume).toBe(false);
    expect(hostPlayer.secret).toBeTruthy();
  });

  it("creates a Hat lobby with empty famous-figure drafts for the host", () => {
    const store = new RoomStore();
    const { room, hostPlayer } = store.createRoom({
      gameKind: "hat",
      hostName: "Hatter",
    });

    expect(room.gameKind).toBe("hat");
    expect(room.hatClueDrafts).toBeDefined();
    expect(room.hatClueDrafts?.[hostPlayer.id]).toBeDefined();
    expect(room.hatClueDrafts?.[hostPlayer.id]?.every((v) => v === "")).toBe(true);
  });

  it("creates an Imposter lobby with no teams and an in-range imposter count", () => {
    const store = new RoomStore();
    const { room, hostPlayer } = store.createRoom({
      gameKind: "imposter",
      hostName: "Host",
    });

    expect(room.gameKind).toBe("imposter");
    expect(room.teamCount).toBe(0);
    expect(room.teamNames).toEqual([]);
    expect(hostPlayer.teamIndex).toBeNull();
    // After clamping for a 1-player lobby, both counts collapse but stay coherent.
    expect(room.imposterPlayerCount).toBeGreaterThan(0);
    expect(room.imposterImposterCount).toBeGreaterThanOrEqual(0);
    expect(room.imposterImposterCount).toBeLessThanOrEqual(room.imposterPlayerCount);
  });

  it("trims and caps the host display name at 32 chars", () => {
    const store = new RoomStore();
    const long = "x".repeat(50);
    const { hostPlayer } = store.createRoom({
      gameKind: "hat",
      hostName: long,
    });

    expect(hostPlayer.name).toHaveLength(32);
  });

  it("falls back to 'Host' when the trimmed name is empty", () => {
    const store = new RoomStore();
    const { hostPlayer } = store.createRoom({
      gameKind: "imposter",
      hostName: "   ",
    });

    expect(hostPlayer.name).toBe("Host");
  });

  it("generates unique room codes", () => {
    const store = new RoomStore();
    const first = store.createRoom({ gameKind: "hat", hostName: "A" }).room.code;
    const second = store.createRoom({ gameKind: "hat", hostName: "B" }).room.code;

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Z0-9]+$/);
  });
});

describe("RoomStore.joinRoom", () => {
  it("balances new joiners across the smallest team for a team game", () => {
    const store = new RoomStore();
    const { room } = store.createRoom({
      gameKind: "whowhatwhere",
      hostName: "Host",
    });

    // Host sits on team 0; first guest should land on the empty team (1).
    const { player: guest1 } = store.joinRoom({ code: room.code, name: "G1" });
    expect(guest1.teamIndex).toBe(1);

    // Both teams now have 1 — pickSmallestTeamIndex prefers index 0 on ties.
    const { player: guest2 } = store.joinRoom({ code: room.code, name: "G2" });
    expect(guest2.teamIndex).toBe(0);
  });

  it("rejects Imposter joins once the room is full", () => {
    const store = new RoomStore();
    const code = fillImposterRoom(store);

    expect(() => store.joinRoom({ code, name: "Overflow" })).toThrow(/Imposter room is full/);
  });

  it("rejects joins after the lobby has started", () => {
    const store = new RoomStore();
    const { room } = store.createRoom({ gameKind: "hat", hostName: "Host" });
    room.phase = "playing";

    expect(() => store.joinRoom({ code: room.code, name: "Late" })).toThrow();
  });

  it("rejects joins when no room exists for the code", () => {
    const store = new RoomStore();

    expect(() => store.joinRoom({ code: "NOPE", name: "P" })).toThrow();
  });

  it("falls back to 'Player' when the trimmed name is empty", () => {
    const store = new RoomStore();
    const { room } = store.createRoom({ gameKind: "whowhatwhere", hostName: "Host" });
    const { player } = store.joinRoom({ code: room.code, name: "   " });

    expect(player.name).toBe("Player");
  });

  it("seeds Hat clue drafts for each new joiner", () => {
    const store = new RoomStore();
    const { room } = store.createRoom({ gameKind: "hat", hostName: "Host" });
    const { player } = store.joinRoom({ code: room.code, name: "Guest" });

    expect(room.hatClueDrafts?.[player.id]).toBeDefined();
    expect(room.hatClueDrafts?.[player.id]?.every((v) => v === "")).toBe(true);
  });

  it("refuses to overfill a team for team games", () => {
    const store = new RoomStore();
    const { room } = store.createRoom({
      gameKind: "whowhatwhere",
      hostName: "Host",
    });

    // Force everyone onto team 0 so the next join would exceed MAX_PLAYERS_PER_TEAM.
    // pickSmallestTeamIndex would balance them; mutate teamIndex to recreate the hostile case.
    for (let i = 0; i < MAX_PLAYERS_PER_TEAM - 1; i += 1) {
      const { player } = store.joinRoom({ code: room.code, name: `P${i}` });
      player.teamIndex = 0;
    }

    // Drop team 1 so pickSmallestTeamIndex still picks 0 even after the above.
    room.teamCount = 1;
    room.teamNames = room.teamNames.slice(0, 1);

    expect(() => store.joinRoom({ code: room.code, name: "Overflow" })).toThrow(
      /Teams can have at most/,
    );
  });
});

describe("RoomStore.authenticate", () => {
  it("returns the player when the secret matches", () => {
    const store = new RoomStore();
    const { room, hostPlayer } = store.createRoom({
      gameKind: "hat",
      hostName: "Host",
    });

    const authed = store.authenticate({
      code: room.code,
      playerId: hostPlayer.id,
      secret: hostPlayer.secret,
    });

    expect(authed?.id).toBe(hostPlayer.id);
  });

  it("returns null on a wrong secret", () => {
    const store = new RoomStore();
    const { room, hostPlayer } = store.createRoom({
      gameKind: "hat",
      hostName: "Host",
    });

    expect(
      store.authenticate({
        code: room.code,
        playerId: hostPlayer.id,
        secret: "definitely-wrong",
      }),
    ).toBeNull();
  });

  it("returns null when the room is unknown", () => {
    const store = new RoomStore();

    expect(
      store.authenticate({
        code: "NOPE",
        playerId: "x",
        secret: "y",
      }),
    ).toBeNull();
  });

  it("returns null when the player id is unknown in a real room", () => {
    const store = new RoomStore();
    const { room, hostPlayer } = store.createRoom({
      gameKind: "imposter",
      hostName: "Host",
    });

    expect(
      store.authenticate({
        code: room.code,
        playerId: "ghost",
        secret: hostPlayer.secret,
      }),
    ).toBeNull();
  });
});

describe("computeResumeEligible", () => {
  it("returns false during the lobby phase", () => {
    const store = new RoomStore();
    const { room } = store.createRoom({ gameKind: "hat", hostName: "Host" });

    expect(computeResumeEligible(room)).toBe(false);
  });

  it("returns false when the only player is disconnected", () => {
    const store = new RoomStore();
    const { room, hostPlayer } = store.createRoom({
      gameKind: "hat",
      hostName: "Host",
    });
    room.phase = "playing";
    hostPlayer.disconnectedAt = Date.now();

    expect(computeResumeEligible(room)).toBe(false);
  });

  it("returns false when everyone opted out", () => {
    const store = new RoomStore();
    const { room, hostPlayer } = store.createRoom({
      gameKind: "hat",
      hostName: "Host",
    });
    room.phase = "playing";
    hostPlayer.optedOutOfResume = true;

    expect(computeResumeEligible(room)).toBe(false);
  });

  it("returns true when at least one connected player has not opted out", () => {
    const store = new RoomStore();
    const { room } = store.createRoom({ gameKind: "hat", hostName: "Host" });
    room.phase = "playing";

    expect(computeResumeEligible(room)).toBe(true);
  });
});

describe("archiveRoomAfterAllPlayersOptedOut", () => {
  it("ends the room and clears the per-game snapshots", () => {
    const store = new RoomStore();
    const { room } = store.createRoom({ gameKind: "hat", hostName: "Host" });
    room.phase = "playing";
    room.hatSession = { __dummy: true } as never;
    room.wwwMatch = { __dummy: true } as never;
    room.imposterSnapshot = { __dummy: true } as never;
    room.replayOfferActive = true;
    room.replayAcceptedPlayerIds = ["x"];

    archiveRoomAfterAllPlayersOptedOut(room);

    expect(room.phase).toBe("ended");
    expect(room.hatSession).toBeUndefined();
    expect(room.wwwMatch).toBeUndefined();
    expect(room.imposterSnapshot).toBeUndefined();
    expect(room.replayOfferActive).toBeUndefined();
    expect(room.replayAcceptedPlayerIds).toBeUndefined();
  });
});

describe("resetLobbyAfterReplay", () => {
  it("returns the room to a clean lobby and keeps players available", () => {
    const store = new RoomStore();
    const { room, hostPlayer } = store.createRoom({ gameKind: "hat", hostName: "Host" });
    room.phase = "playing";
    room.hatSession = { __dummy: true } as never;
    room.wwwReadyReveal = true;
    room.replayOfferActive = true;
    room.replayAcceptedPlayerIds = [hostPlayer.id];
    hostPlayer.ready = true;
    hostPlayer.optedOutOfResume = true;

    resetLobbyAfterReplay(room);

    expect(room.phase).toBe("lobby");
    expect(room.hatSession).toBeUndefined();
    expect(room.wwwReadyReveal).toBeUndefined();
    expect(room.replayOfferActive).toBeUndefined();
    expect(room.replayAcceptedPlayerIds).toBeUndefined();
    expect(hostPlayer.ready).toBe(false);
    expect(hostPlayer.optedOutOfResume).toBe(false);
  });
});

describe("assertTeamLobbyReady", () => {
  it("accepts team games when every team has the minimum roster", () => {
    const store = new RoomStore();
    const { room } = store.createRoom({ gameKind: "whowhatwhere", hostName: "Host" });
    const { player: teamOneGuest } = store.joinRoom({
      code: room.code,
      name: "Team one guest",
    });
    const { player: teamTwoGuestOne } = store.joinRoom({
      code: room.code,
      name: "Team two guest one",
    });
    const { player: teamTwoGuestTwo } = store.joinRoom({
      code: room.code,
      name: "Team two guest two",
    });
    teamOneGuest.teamIndex = 0;
    teamTwoGuestOne.teamIndex = 1;
    teamTwoGuestTwo.teamIndex = 1;

    expect(() => assertTeamLobbyReady(room)).not.toThrow();
  });

  it("rejects team games with an understaffed team", () => {
    const store = new RoomStore();
    const { room } = store.createRoom({ gameKind: "hat", hostName: "Host" });
    const { player: guest } = store.joinRoom({ code: room.code, name: "Guest" });
    guest.teamIndex = 0;

    expect(() => assertTeamLobbyReady(room)).toThrow(/Team 2 needs at least/);
  });

  it("ignores flat Imposter lobbies", () => {
    const store = new RoomStore();
    const { room } = store.createRoom({ gameKind: "imposter", hostName: "Host" });

    expect(() => assertTeamLobbyReady(room)).not.toThrow();
  });
});

describe("RoomStore.peek", () => {
  it("normalizes the room code (case-insensitive) and reports resumeEligible", () => {
    const store = new RoomStore();
    const { room } = store.createRoom({ gameKind: "hat", hostName: "Host" });

    const lower = store.peek(room.code.toLowerCase());
    expect(lower?.code).toBe(room.code);
    expect(lower?.resumeEligible).toBe(false); // still lobby

    room.phase = "playing";
    expect(store.peek(room.code)?.resumeEligible).toBe(true);
  });

  it("returns null for an unknown code", () => {
    const store = new RoomStore();
    expect(store.peek("NOSUCH")).toBeNull();
  });
});
