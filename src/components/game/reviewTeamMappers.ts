import type { ReviewTeamDisplayRow } from "@/components/game/ReviewTeamsPanel";
import type { Player, Team } from "@/domain/hat-game/types";
import type { TeamSetup } from "@/domain/whowhatwhere/types";

/** Build rows for `ReviewTeamsPanel` from Hat roster state. */
export function reviewDisplayRowsFromHat(
  teams: readonly Team[],
  players: readonly Player[],
): ReviewTeamDisplayRow[] {
  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    playerNames: players
      .filter((player) => player.teamId === team.id)
      .map((player) => player.name),
  }));
}

/** Build rows for `ReviewTeamsPanel` from WWW setup teams. */
export function reviewDisplayRowsFromWww(
  teams: readonly TeamSetup[],
): ReviewTeamDisplayRow[] {
  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    playerNames: team.players.map((player) => player.name),
  }));
}
