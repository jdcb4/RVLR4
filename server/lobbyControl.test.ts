import { describe, expect, it } from "vitest";

import { hostPatchWhoWhatWhereSettings, hostSetTeamCount } from "./lobbyControl.ts";
import { assertTeamLobbyReady, type Room, RoomStore } from "./roomStore.ts";

function roster(count: number) {
  const store = new RoomStore();
  const { room } = store.createRoom({ gameKind: "whowhatwhere", hostName: "Host" });
  hostSetTeamCount(room, 4);
  for (let index = 1; index < count; index++)
    store.joinRoom({ code: room.code, name: `Player ${index}` });
  return room;
}
function snapshot(room: Room) {
  return JSON.stringify({
    count: room.teamCount,
    names: room.teamNames,
    settings: room.wwwSettings,
    players: [...room.players.values()].map(({ id, teamIndex }) => ({ id, teamIndex })),
  });
}

describe("atomic team-count changes", () => {
  it.each([
    [12, 2],
    [18, 3],
  ] as const)("fits %i players into %i teams", (players, teams) => {
    const room = roster(players);
    hostSetTeamCount(room, teams);
    expect(room.teamCount).toBe(teams);
    expect(room.wwwSettings.teamCount).toBe(teams);
    expect(
      Array.from(
        { length: teams },
        (_, index) =>
          [...room.players.values()].filter((player) => player.teamIndex === index).length,
      ),
    ).toEqual(Array.from({ length: teams }, () => 6));
    expect(() => assertTeamLobbyReady(room)).not.toThrow();
  });
  it.each([13, 24])(
    "rejects a two-team reduction for %i players without any mutation",
    (players) => {
      const room = roster(players);
      const before = snapshot(room);
      expect(() => hostSetTeamCount(room, 2)).toThrow("at most 12 players");
      expect(snapshot(room)).toBe(before);
      expect(() =>
        hostPatchWhoWhatWhereSettings(room, { teamCount: 2, turnDurationSeconds: 75 }),
      ).toThrow("at most 12 players");
      expect(snapshot(room)).toBe(before);
    },
  );
  it.each([0, 2.5, 5])("rejects invalid team count %s", (count) => {
    const room = roster(4);
    const before = snapshot(room);
    expect(() => hostSetTeamCount(room, count)).toThrow("between 2 and 4");
    expect(snapshot(room)).toBe(before);
  });
  it("rejects an oversized team at the domain start gate too", () => {
    const room = roster(9);
    [...room.players.values()].forEach((player, index) => {
      player.teamIndex = index < 7 ? 0 : 1;
    });
    expect(() => assertTeamLobbyReady(room)).toThrow("at most 6 players");
  });
});
