import {
  MAX_PLAYERS_PER_TEAM,
  MIN_PLAYERS_PER_TEAM,
} from "@/config/teamRoster";

import { getTeamNameSet } from "./teamNames";
import { CATEGORIES, type Category, type GameSettings, type TeamSetup } from "./types";

const PLAYER_NAME_LIMIT = 24;
export const TEAM_NAME_LIMIT = 24;

/** Re-export for callers that already import limits from domain setup. */
export { MAX_PLAYERS_PER_TEAM, MIN_PLAYERS_PER_TEAM } from "@/config/teamRoster";

export function createDefaultSettings(): GameSettings {
  return {
    teamCount: 2,
    turnDurationSeconds: 45,
    totalRounds: 2,
    skipLimit: 1,
    selectedCategories: CATEGORIES,
    difficultyMode: "easy",
    hints: {
      enabled: false,
      perTurnLimit: 3,
    },
  };
}

export function normalizeName(name: string, fallback: string, limit = PLAYER_NAME_LIMIT) {
  const trimmed = name.trim().replace(/\s+/g, " ");

  return (trimmed || fallback).slice(0, limit);
}

export function createTeamSetups(teamCount: GameSettings["teamCount"]): TeamSetup[] {
  return Array.from({ length: teamCount }, (_, teamIndex) =>
    createTeamSetup(teamIndex),
  );
}

export function reconcileTeamSetups(
  existing: readonly TeamSetup[],
  teamCount: GameSettings["teamCount"],
) {
  return Array.from({ length: teamCount }, (_, teamIndex) => {
    return existing[teamIndex] ?? createTeamSetup(teamIndex);
  });
}

function createTeamSetup(teamIndex: number): TeamSetup {
  const teamNumber = teamIndex + 1;
  const teamNameSet = getTeamNameSet(teamIndex);

  return {
    id: `team-${teamNumber}`,
    name: teamNameSet.name,
    players: [
      { id: `team-${teamNumber}-player-1`, name: teamNameSet.members[0]! },
      { id: `team-${teamNumber}-player-2`, name: teamNameSet.members[1]! },
    ],
  };
}

export function addPlayerToTeam(
  teams: readonly TeamSetup[],
  teamId: string,
): TeamSetup[] {
  return teams.map((team) => {
    if (team.id !== teamId || team.players.length >= MAX_PLAYERS_PER_TEAM) {
      return team;
    }

    const nextNumber =
      Math.max(
        0,
        ...team.players.map((player) => {
          const match = player.id.match(/player-(\d+)/);

          return match ? Number(match[1]) : 0;
        }),
      ) + 1;
    const teamIndex = Number(team.id.replace("team-", "")) - 1;
    const defaultName =
      getTeamNameSet(Number.isFinite(teamIndex) ? teamIndex : 0).members[
        nextNumber - 1
      ] ?? `Player ${nextNumber}`;

    return {
      ...team,
      players: [
        ...team.players,
        {
          id: `${team.id}-player-${nextNumber}`,
          name: defaultName,
        },
      ],
    };
  });
}

export function removePlayerFromTeam(
  teams: readonly TeamSetup[],
  teamId: string,
  playerId: string,
): TeamSetup[] {
  return teams.map((team) => {
    if (team.id !== teamId || team.players.length <= MIN_PLAYERS_PER_TEAM) {
      return team;
    }

    return {
      ...team,
      players: team.players.filter((player) => player.id !== playerId),
    };
  });
}

export function updateTeamName(
  teams: readonly TeamSetup[],
  teamId: string,
  name: string,
): TeamSetup[] {
  return teams.map((team) =>
    team.id === teamId ? { ...team, name: name.slice(0, TEAM_NAME_LIMIT) } : team,
  );
}

export function updatePlayerName(
  teams: readonly TeamSetup[],
  teamId: string,
  playerId: string,
  name: string,
): TeamSetup[] {
  return teams.map((team) => {
    if (team.id !== teamId) {
      return team;
    }

    return {
      ...team,
      players: team.players.map((player) =>
        player.id === playerId
          ? { ...player, name: name.slice(0, PLAYER_NAME_LIMIT) }
          : player,
      ),
    };
  });
}

export function toggleCategory(
  selectedCategories: readonly Category[],
  category: Category,
) {
  if (selectedCategories.includes(category)) {
    const nextCategories = selectedCategories.filter((item) => item !== category);

    return nextCategories.length > 0 ? nextCategories : selectedCategories;
  }

  return CATEGORIES.filter(
    (item) => item === category || selectedCategories.includes(item),
  );
}

export function validateSetup(
  teams: readonly TeamSetup[],
  settings: GameSettings,
): string[] {
  const errors: string[] = [];
  const totalPlayers = teams.reduce((count, team) => count + team.players.length, 0);

  if (settings.selectedCategories.length < 1) {
    errors.push("Select at least one category.");
  }

  if (teams.length !== settings.teamCount) {
    errors.push("Team count does not match setup.");
  }

  if (totalPlayers < settings.teamCount * MIN_PLAYERS_PER_TEAM) {
    errors.push("Each team needs at least 2 players.");
  }

  for (const team of teams) {
    if (team.players.length < MIN_PLAYERS_PER_TEAM) {
      errors.push(`${team.name || "Each team"} needs at least 2 players.`);
    }

    if (team.players.length > MAX_PLAYERS_PER_TEAM) {
      errors.push(`${team.name || "Each team"} can have up to 6 players.`);
    }
  }

  return errors;
}
