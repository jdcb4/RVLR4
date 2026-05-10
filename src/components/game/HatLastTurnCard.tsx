import { READY_RECAP_PANEL_CLASS } from "@/components/game/readySharedClasses";
import type { ClueHistoryEntry } from "@/domain/hat-game/types";

export function HatLastTurnCard({
  summary,
}: {
  readonly summary: {
    readonly teamName: string;
    readonly scoreDelta: number;
    readonly describerName: string;
    readonly correctCount: number;
    readonly skippedCount: number;
    readonly phaseCompleted: boolean;
    readonly completedPhaseNumber: number | null;
    readonly nextPhaseName: string | null;
    readonly clues: readonly ClueHistoryEntry[];
  };
}) {
  const correct = summary.clues.filter((entry) => entry.status === "correct");
  const skipped = summary.clues.filter((entry) => entry.status === "skipped");

  return (
    <div className={READY_RECAP_PANEL_CLASS}>
      <p className="font-medium text-typ-ui text-muted-foreground">Last turn</p>
      <p className="mt-1 font-semibold">
        {summary.teamName}: +{summary.scoreDelta}
      </p>
      <p className="mt-1 text-muted-foreground">
        {summary.describerName} got {summary.correctCount} correct and skipped{" "}
        {summary.skippedCount}.
      </p>
      {summary.phaseCompleted ? (
        <p className="mt-1 text-muted-foreground">
          Phase {summary.completedPhaseNumber} complete
          {summary.nextPhaseName ? `. Next: ${summary.nextPhaseName}.` : "."}
        </p>
      ) : null}
      <ClueWords correct={correct} skipped={skipped} />
    </div>
  );
}

function ClueWords({
  correct,
  skipped,
}: {
  readonly correct: readonly ClueHistoryEntry[];
  readonly skipped: readonly ClueHistoryEntry[];
}) {
  if (correct.length === 0 && skipped.length === 0) {
    return null;
  }

  return (
    <details className="mt-3 border-t border-semantic-border-faint pt-3">
      <summary className="cursor-pointer font-medium text-typ-ui text-muted-foreground">
        Words
      </summary>
      <div className="mt-2 max-h-28 space-y-2 overflow-y-auto text-typ-micro">
        <ClueChipGroup label="Correct" clues={correct} />
        <ClueChipGroup label="Skipped" clues={skipped} />
      </div>
    </details>
  );
}

function ClueChipGroup({
  label,
  clues,
}: {
  readonly label: string;
  readonly clues: readonly ClueHistoryEntry[];
}) {
  if (clues.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 font-semibold text-muted-foreground">{label}</span>
      {clues.map((entry) => (
        <span
          key={`${entry.timestamp}-${entry.clue}-${entry.poolIndex}`}
          className="rounded-md border border-border bg-background px-2 py-1"
        >
          {entry.clue}
        </span>
      ))}
    </div>
  );
}
