import { GameScoreboard } from "@/components/game/GameScoreboard";
import type { HatGameSession } from "@/domain/hat-game/types";

/** Between-turns score list — highlights the team that just played. */
export function HatScoreboard({ session }: { readonly session: HatGameSession }) {
  const highlightTeamId = session.lastTurnSummary?.teamId;

  return (
    <GameScoreboard
      {...(highlightTeamId ? { highlightTeamId } : {})}
      sortDescendingByScore={false}
      teams={session.teams.map((team) => ({
        id: team.id,
        name: team.name,
        score: team.score,
      }))}
    />
  );
}
