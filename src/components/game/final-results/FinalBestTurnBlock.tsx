import type { FinalBestTurnVm } from "@/components/game/final-results/viewModel";

/**
 * Highlights the single best scoring turn — player first, big score, team subtle.
 */
export function FinalBestTurnBlock({
  bestTurn,
}: {
  readonly bestTurn: FinalBestTurnVm | null;
}) {
  if (!bestTurn) {
    return null;
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-accent/50 bg-accent/5 px-4 py-5 shadow-inner">
      <h3 className="text-typ-section-title font-semibold tracking-tight text-foreground">
        Best turn
      </h3>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-typ-panel-title font-bold leading-tight text-foreground">
            {bestTurn.playerName}
          </p>
          <p className="mt-1 text-typ-ui text-muted-foreground">{bestTurn.teamName}</p>
        </div>
        <p className="shrink-0 text-typ-metric font-bold tabular-nums text-foreground">
          {bestTurn.score}
        </p>
      </div>
    </div>
  );
}
