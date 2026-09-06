import { IMPOSTER_MAX_PLAYERS, IMPOSTER_MIN_PLAYERS } from "@/config/imposterDefaults";
import { MAX_PLAYERS_PER_TEAM } from "@/config/teamRoster";
import { createTeamSetups, validateSetup } from "@/domain/whowhatwhere/setup";
import type { GameSettings, TeamSetup } from "@/domain/whowhatwhere/types";

import { clampImposterLobbyCounts, type GameKind, type Room } from "./roomStore.ts";

const MIN_TEAMS = 2;
const MAX_TEAMS = 4;

function isTeamGame(kind: GameKind) {
  return kind === "whowhatwhere" || kind === "hat";
}

function countPlayersOnTeam(room: Room, teamIndex: number): number {
  return [...room.players.values()].filter((player) => player.teamIndex === teamIndex).length;
}

function pickSmallestTeamIndex(room: Room): number {
  const counts = Array.from({ length: room.teamCount }, (_, teamIndex) =>
    countPlayersOnTeam(room, teamIndex),
  );

  let bestIndex = 0;
  let bestValue = counts[0] ?? 0;

  for (let index = 1; index < counts.length; index += 1) {
    const value = counts[index] ?? 0;

    if (value < bestValue) {
      bestValue = value;
      bestIndex = index;
    }
  }

  return bestIndex;
}

export function hostSetTeamCount(room: Room, nextCount: number) {
  if (!isTeamGame(room.gameKind)) {
    return;
  }

  if (!Number.isInteger(nextCount) || nextCount < MIN_TEAMS || nextCount > MAX_TEAMS) {
    throw new Error("Team count must be between 2 and 4.");
  }

  if (room.players.size > nextCount * MAX_PLAYERS_PER_TEAM) {
    throw new Error(
      `${nextCount} teams can hold at most ${nextCount * MAX_PLAYERS_PER_TEAM} players. Keep more teams or remove departed players first.`,
    );
  }

  if (room.gameKind === "whowhatwhere") {
    room.wwwSettings = { ...room.wwwSettings, teamCount: nextCount as 2 | 3 | 4 };
  }

  if (nextCount === room.teamCount) {
    return;
  }

  if (nextCount > room.teamCount) {
    const freshSetups = createTeamSetups(nextCount as 2 | 3 | 4);
    const nextNames = freshSetups.map((team, index) => room.teamNames[index] ?? team.name);
    room.teamCount = nextCount;
    room.teamNames = nextNames;

    return;
  }

  room.teamCount = nextCount;
  room.teamNames = room.teamNames.slice(0, nextCount);

  for (const player of room.players.values()) {
    if (player.teamIndex !== null && player.teamIndex >= room.teamCount) {
      player.teamIndex = pickSmallestTeamIndex(room);
    }
  }

  rebalanceOverflow(room);
}

export function hostSetTeamName(room: Room, teamIndex: number, name: string) {
  if (!isTeamGame(room.gameKind)) {
    return;
  }

  if (teamIndex < 0 || teamIndex >= room.teamCount) {
    throw new Error("Unknown team bench.");
  }

  const trimmed = name.trim().slice(0, 24);
  const next = [...room.teamNames];
  next[teamIndex] = trimmed.length > 0 ? trimmed : (next[teamIndex] ?? `Team ${teamIndex + 1}`);
  room.teamNames = next;
}

export function movePlayerToTeam(args: {
  room: Room;
  actorId: string;
  targetPlayerId: string;
  teamIndex: number;
  mode: "host" | "self";
}) {
  const { room, actorId, targetPlayerId, teamIndex, mode } = args;

  if (!isTeamGame(room.gameKind)) {
    throw new Error("Teams are not used in this game.");
  }

  const actor = room.players.get(actorId);
  const target = room.players.get(targetPlayerId);

  if (!actor || !target) {
    throw new Error("Player not found.");
  }

  if (mode === "self" && actorId !== targetPlayerId) {
    throw new Error("You can only move yourself.");
  }

  if (mode === "host" && !actor.isHost) {
    throw new Error("Only the host can move other players.");
  }

  if (teamIndex < 0 || teamIndex >= room.teamCount) {
    throw new Error("Unknown team bench.");
  }

  const hypothetical =
    countPlayersOnTeam(room, teamIndex) + (target.teamIndex === teamIndex ? 0 : 1);

  if (hypothetical > MAX_PLAYERS_PER_TEAM) {
    throw new Error(`Teams can have at most ${MAX_PLAYERS_PER_TEAM} players.`);
  }

  target.teamIndex = teamIndex;
}

function rebalanceOverflow(room: Room) {
  if (!isTeamGame(room.gameKind)) {
    return;
  }

  // Capacity is checked before mutation; each move reduces an overflowing
  // team's count, so at most one pass over the roster is needed.
  for (const player of room.players.values()) {
    if (
      player.teamIndex !== null &&
      countPlayersOnTeam(room, player.teamIndex) > MAX_PLAYERS_PER_TEAM
    ) {
      player.teamIndex = pickSmallestTeamIndex(room);
    }
  }
}

export function hostPatchWhoWhatWhereSettings(room: Room, patch: Partial<GameSettings>) {
  if (room.gameKind !== "whowhatwhere") {
    throw new Error("Settings apply to Who What Where only.");
  }

  const nextSettings = {
    ...room.wwwSettings,
    ...patch,
  };

  const reconciledTeamCount = nextSettings.teamCount;

  if (reconciledTeamCount !== room.teamCount) {
    hostSetTeamCount(room, reconciledTeamCount);
  }
  room.wwwSettings = nextSettings;
}

export function hostPatchHatPrefs(
  room: Room,
  patch: {
    readonly hatTurnDurationSeconds?: number;
    readonly hatSkipsPerTurn?: number;
  },
) {
  if (room.gameKind !== "hat") {
    throw new Error("Hat Game settings only.");
  }

  if (patch.hatTurnDurationSeconds !== undefined) {
    room.hatTurnDurationSeconds = patch.hatTurnDurationSeconds;
  }

  if (patch.hatSkipsPerTurn !== undefined) {
    room.hatSkipsPerTurn = patch.hatSkipsPerTurn;
  }
}

export function hostPatchImposterCounts(
  room: Room,
  patch: {
    readonly imposterImposterCount?: number;
  },
) {
  if (room.gameKind !== "imposter") {
    throw new Error("Imposter settings only.");
  }

  if (patch.imposterImposterCount !== undefined) {
    room.imposterImposterCount = patch.imposterImposterCount;
  }

  clampImposterLobbyCounts(room);
}

export function assertLobbyReadyForImposterStart(room: Room) {
  if (room.gameKind !== "imposter") {
    return;
  }

  if (room.players.size < IMPOSTER_MIN_PLAYERS) {
    throw new Error(`Imposter needs at least ${IMPOSTER_MIN_PLAYERS} players.`);
  }

  if (room.players.size > IMPOSTER_MAX_PLAYERS) {
    throw new Error(`Imposter supports at most ${IMPOSTER_MAX_PLAYERS} players.`);
  }

  clampImposterLobbyCounts(room);
}

export function validateWhoWhatWhereLobby(room: Room, setups: readonly TeamSetup[]) {
  const errors = validateSetup(setups, room.wwwSettings);

  if (errors.length > 0) {
    throw new Error(errors[0] ?? "Check your lobby setup.");
  }
}
