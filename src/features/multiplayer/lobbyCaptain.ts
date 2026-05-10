import type { LobbyDto } from "@/multiplayer/roomTypes";

/**
 * Captain = lexicographically smallest player id on the team (deterministic, matches server).
 */
export function captainPlayerIdForTeam(
  lobby: LobbyDto,
  teamIndex: number,
): string | undefined {
  const members = lobby.players.filter((player) => (player.teamIndex ?? 0) === teamIndex);

  if (members.length === 0) {
    return undefined;
  }

  return members.reduce((a, b) => (a.id < b.id ? a : b)).id;
}
