import { cn } from "@/lib/utils";

export type GameScoreboardTeam = {
  readonly id: string;
  readonly name: string;
  readonly score: number;
};

/**
 * Compact score list — shared Hat / WWW styling (matches legacy Hat “HatScoreboard”).
 */
export function GameScoreboard({
  teams,
  highlightTeamId,
  sortDescendingByScore = false,
}: {
  readonly teams: readonly GameScoreboardTeam[];
  /** Ring highlight — e.g. team that just finished a turn (between-turns ready screens). */
  readonly highlightTeamId?: string | null;
  /** WWW leaderboard-style ordering; Hat keeps roster order when false. */
  readonly sortDescendingByScore?: boolean;
}) {
  const ordered = sortDescendingByScore
    ? [...teams].sort((left, right) => right.score - left.score)
    : [...teams];

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-3">
      <p className="text-typ-ui font-semibold">Scoreboard</p>
      <ul className="space-y-2">
        {ordered.map((team) => (
          <li
            key={team.id}
            className={cn(
              "flex items-center justify-between text-typ-ui font-medium",
              team.id === highlightTeamId &&
                "-mx-1 rounded-md px-2 py-1 ring-2 ring-ring",
            )}
          >
            <span>{team.name}</span>
            <span className="tabular-nums text-muted-foreground">
              {team.score} pts
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
