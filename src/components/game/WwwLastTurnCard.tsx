import { READY_RECAP_PANEL_CLASS } from "@/components/game/readySharedClasses";
import type { LastTurnSummary, WordHistoryEntry } from "@/domain/whowhatwhere/types";

export function WwwLastTurnCard({
  summary,
}: {
  readonly summary: LastTurnSummary | null;
}) {
  if (!summary) {
    return null;
  }

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
      <TurnWords summary={summary} />
    </div>
  );
}

function TurnWords({ summary }: { readonly summary: LastTurnSummary }) {
  const correct = summary.wordHistory.filter((entry) => entry.status === "correct");
  const skipped = summary.wordHistory.filter((entry) => entry.status === "skipped");

  if (correct.length === 0 && skipped.length === 0 && !summary.finalWord) {
    return null;
  }

  return (
    <details className="mt-3 border-t border-semantic-border-faint pt-3">
      <summary className="cursor-pointer font-medium text-typ-ui text-muted-foreground">
        Words
      </summary>
      <div className="mt-2 max-h-28 space-y-2 overflow-y-auto text-typ-micro">
        <WordChipGroup label="Correct" entries={correct} />
        <WordChipGroup label="Skipped" entries={skipped} />
        {summary.finalWord ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 font-semibold text-muted-foreground">Final</span>
            <span className="rounded-md border border-border bg-background px-2 py-1">
              {summary.finalWord.word}
            </span>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function WordChipGroup({
  label,
  entries,
}: {
  readonly label: string;
  readonly entries: readonly WordHistoryEntry[];
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 font-semibold text-muted-foreground">{label}</span>
      {entries.map((entry) => (
        <span
          key={`${entry.timestamp}-${entry.word.word}-${entry.status}`}
          className="rounded-md border border-border bg-background px-2 py-1"
        >
          {entry.word.word}
        </span>
      ))}
    </div>
  );
}
