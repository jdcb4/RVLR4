import { describe, expect, it } from "vitest";

import {
  addPlayerToTeam,
  createDefaultSettings,
  createTeamSetups,
  MAX_PLAYERS_PER_TEAM,
  removePlayerFromTeam,
  toggleCategory,
  updatePlayerName,
  validateSetup,
} from "./setup";

describe("setup domain", () => {
  it("creates hidden future-ready defaults", () => {
    const settings = createDefaultSettings();

    expect(settings.selectedCategories).toEqual(["What", "Who", "Where"]);
    expect(settings.difficultyMode).toBe("easy");
    expect(settings.hints).toEqual({ enabled: false, perTurnLimit: 3 });
  });

  it("keeps at least one selected category", () => {
    expect(toggleCategory(["What"], "What")).toEqual(["What"]);
    expect(toggleCategory(["What"], "Who")).toEqual(["What", "Who"]);
  });

  it("adds and removes only optional players", () => {
    const teams = createTeamSetups(2);
    let withPlayer = addPlayerToTeam(teams, "team-1");

    expect(withPlayer[0]?.players).toHaveLength(3);

    for (let index = 0; index < 10; index += 1) {
      withPlayer = addPlayerToTeam(withPlayer, "team-1");
    }

    expect(withPlayer[0]?.players).toHaveLength(MAX_PLAYERS_PER_TEAM);

    const removed = removePlayerFromTeam(
      withPlayer,
      "team-1",
      withPlayer[0]!.players[2]!.id,
    );

    expect(removed[0]?.players).toHaveLength(MAX_PLAYERS_PER_TEAM - 1);
  });

  it("validates team/player counts and name edits", () => {
    const settings = createDefaultSettings();
    const teams = updatePlayerName(createTeamSetups(2), "team-1", "team-1-player-1", "A very long player name exceeding limit");

    expect(teams[0]?.players[0]?.name).toHaveLength(24);
    expect(validateSetup(teams, settings)).toEqual([]);
  });
});
