import type { FinalLeaderboardRowVm } from "@/components/game/final-results/viewModel";
import { cn } from "@/lib/utils";

function rowAccentClass(row: FinalLeaderboardRowVm): string {
  if (row.isWinner) {
    return "border-semantic-primary-border bg-semantic-primary-soft-bg shadow-md ring-1 ring-primary/20";
  }
  if (row.rank === 2) {
    return "border-border bg-muted/40";
  }
  if (row.rank === 3) {
    return "border-semantic-border-muted bg-accent/10";
  }
  return "border-border bg-card";
}

/**
 * Ordered team list with rank — winners get primary tint (WWW structure + Hat-style colour).
 */
export function FinalLeaderboardBlock({
  rows,
}: {
  readonly rows: readonly FinalLeaderboardRowVm[];
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-typ-section-title font-semibold tracking-tight text-foreground">
        Final Leaderboard
      </h3>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.teamId}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border px-4 py-3",
              rowAccentClass(row),
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="w-9 shrink-0 text-center text-typ-ui font-bold tabular-nums text-muted-foreground">
                {row.rank}
              </span>
              <span className="truncate font-semibold text-foreground">{row.teamName}</span>
            </div>
            <span className="shrink-0 text-typ-metric font-bold tabular-nums text-foreground">
              {row.score}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
