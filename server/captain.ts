import type { RoomPlayer } from "./roomStore.ts";

/** Captain = lexicographically smallest player id on the team (matches client `lobbyCaptain.ts`). */
export function captainPlayerIdForTeam(
  players: Iterable<RoomPlayer>,
  teamIndex: number,
): string | null {
  const members = [...players].filter((player) => player.teamIndex === teamIndex);

  if (members.length === 0) {
    return null;
  }

  return members.reduce((a, b) => (a.id < b.id ? a : b)).id;
}
