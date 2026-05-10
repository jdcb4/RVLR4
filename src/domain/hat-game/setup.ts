import { GAME_DEFAULTS } from "@/config/hatGameDefaults";
import {
  MAX_PLAYERS_PER_TEAM,
  MIN_PLAYERS_PER_TEAM,
} from "@/config/teamRoster";
import namePacks from "@/data/namePacks.json";
import type { RosterTeamRow } from "@/domain/shared/rosterRow";

import { sortPlayersBySeat } from "./teamUtils";
import type { Player, Team } from "./types";

type NamePack = {
  teamName: string;
  playerNames: string[];
};

const fallbackNames = [
  'Alex',
  'Sam',
  'Jordan',
  'Casey',
  'Riley',
  'Morgan',
  'Jamie',
  'Taylor',
  'Cameron',
  'Quinn',
  'Avery',
  'Rowan'
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.trunc(value)));

export const getHatGameSetupError = ({
  playerCount,
  teamCount,
  teams,
  players,
}: {
  playerCount: number;
  teamCount: number;
  teams?: Team[];
  players?: Player[];
}) => {
  if (teamCount < GAME_DEFAULTS.minTeams || teamCount > GAME_DEFAULTS.maxTeams) {
    return `Choose ${GAME_DEFAULTS.minTeams}-${GAME_DEFAULTS.maxTeams} teams.`;
  }
  if (
    playerCount < GAME_DEFAULTS.minPlayers ||
    playerCount > GAME_DEFAULTS.maxPlayers
  ) {
    return `This setup supports ${GAME_DEFAULTS.minPlayers}-${GAME_DEFAULTS.maxPlayers} players total.`;
  }
  if (playerCount < teamCount * MIN_PLAYERS_PER_TEAM) {
    return "Each team needs at least 2 players.";
  }
  if (playerCount > teamCount * MAX_PLAYERS_PER_TEAM) {
    return "Each team can have at most 6 players.";
  }
  if (teams && players) {
    for (const team of teams) {
      const size = players.filter((player) => player.teamId === team.id).length;
      if (size < MIN_PLAYERS_PER_TEAM) {
        return `${team.name} needs at least 2 players.`;
      }
      if (size > MAX_PLAYERS_PER_TEAM) {
        return `${team.name} can have at most 6 players.`;
      }
    }
  }
  return null;
};

const shuffledPacks = () =>
  [...(namePacks as NamePack[])]
    .map((pack) => ({ pack, sort: Math.random() }))
    .sort((left, right) => left.sort - right.sort)
    .map(({ pack }) => pack);

export const buildDefaultSetup = (playerCount: number, teamCount: number) => {
  const safeTeamCount = clamp(teamCount, GAME_DEFAULTS.minTeams, GAME_DEFAULTS.maxTeams);
  const safePlayerCount = clamp(playerCount, GAME_DEFAULTS.minPlayers, GAME_DEFAULTS.maxPlayers);
  const packs = shuffledPacks();
  const teams: Team[] = Array.from({ length: safeTeamCount }, (_, index) => ({
    id: `team-${String.fromCharCode(97 + index)}`,
    name: packs[index]?.teamName ?? `Team ${index + 1}`,
    score: 0
  }));
  const players: Player[] = Array.from({ length: safePlayerCount }, (_, index) => {
    const teamIndex = index % safeTeamCount;
    const playerNumberWithinTeam = Math.floor(index / safeTeamCount);
    const packName = packs[teamIndex]?.playerNames[playerNumberWithinTeam];
    return {
      id: `player-${index + 1}`,
      seat: index,
      name: packName ?? fallbackNames[index % fallbackNames.length] ?? `Player ${index + 1}`,
      teamId: teams[teamIndex]!.id,
    };
  });

  return { teams, players };
};

/** Roster rows for the shared team-setup UI (same shape as WhoWhatWhere `TeamSetup` players). */
export type HatRosterTeamRow = RosterTeamRow;

export function hatStateToRosterRows(teams: Team[], players: Player[]): HatRosterTeamRow[] {
  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    players: sortPlayersBySeat(players)
      .filter((player) => player.teamId === team.id)
      .map((player) => ({ id: player.id, name: player.name })),
  }));
}

/**
 * Apply edited roster back into Hat state, preserving team scores and trimming names.
 */
export function applyRosterRowsToHat(
  roster: readonly HatRosterTeamRow[],
  prevTeams: readonly Team[],
): { teams: Team[]; players: Player[] } {
  const teams: Team[] = roster.map((row) => {
    const prev = prevTeams.find((t) => t.id === row.id);
    return {
      id: row.id,
      name: row.name.slice(0, GAME_DEFAULTS.maxNameLength),
      score: prev?.score ?? 0,
    };
  });

  const players: Player[] = [];
  let seat = 0;
  for (const row of roster) {
    for (const rp of row.players) {
      players.push({
        id: rp.id,
        name: rp.name.slice(0, GAME_DEFAULTS.maxNameLength),
        teamId: row.id,
        seat: seat++,
      });
    }
  }

  return { teams, players };
}

export function addPlayerToHatTeam(
  teams: readonly Team[],
  players: readonly Player[],
  teamId: string,
): { teams: Team[]; players: Player[] } | null {
  const teamIndex = teams.findIndex((team) => team.id === teamId);
  if (teamIndex < 0) {
    return null;
  }

  const onTeam = players.filter((player) => player.teamId === teamId);
  if (onTeam.length >= MAX_PLAYERS_PER_TEAM) {
    return null;
  }

  const packs = shuffledPacks();
  const slot = onTeam.length;
  const packName = packs[teamIndex]?.playerNames[slot];

  const nextIdNum =
    Math.max(
      0,
      ...players.map((player) => {
        const match = player.id.match(/^player-(\d+)$/);
        return match ? Number(match[1]) : 0;
      }),
    ) + 1;

  const newPlayer: Player = {
    id: `player-${nextIdNum}`,
    name:
      packName ??
      fallbackNames[nextIdNum % fallbackNames.length] ??
      `Player ${nextIdNum}`,
    teamId,
    seat: players.length,
  };

  const merged = [...players, newPlayer];
  const sorted = sortPlayersBySeat(merged);
  const reseated = sorted.map((player, index) => ({ ...player, seat: index }));

  return { teams: [...teams], players: reseated };
}

export function removePlayerFromHatTeam(
  teams: readonly Team[],
  players: readonly Player[],
  teamId: string,
  playerId: string,
): { teams: Team[]; players: Player[] } | null {
  const onTeam = players.filter((player) => player.teamId === teamId);
  if (onTeam.length <= MIN_PLAYERS_PER_TEAM) {
    return null;
  }
  if (!onTeam.some((player) => player.id === playerId)) {
    return null;
  }

  const filtered = players.filter((player) => player.id !== playerId);
  const sorted = sortPlayersBySeat(filtered);
  const reseated = sorted.map((player, index) => ({ ...player, seat: index }));

  return { teams: [...teams], players: reseated };
}
