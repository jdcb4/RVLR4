import type { TeamSetup } from "@/domain/whowhatwhere/types";

import type { Room } from "./roomStore.ts";

/** Builds TeamSetup rows from the in-memory lobby roster before starting Who What Where / Hat Game. */
export function buildTeamSetupsFromLobby(room: Room): TeamSetup[] {
  const setups: TeamSetup[] = [];

  for (let teamIndex = 0; teamIndex < room.teamCount; teamIndex += 1) {
    const roster = [...room.players.values()].filter(
      (player) => player.teamIndex === teamIndex,
    );

    setups.push({
      id: `team-${teamIndex + 1}`,
      name: room.teamNames[teamIndex] ?? `Team ${teamIndex + 1}`,
      players: roster.map((player, playerIndex) => ({
        // Preserve lobby UUIDs so turns + socket actions line up with MatchState.players.
        id: player.id,
        name: player.name || `Player ${teamIndex + 1}.${playerIndex + 1}`,
      })),
    });
  }

  return setups;
}
