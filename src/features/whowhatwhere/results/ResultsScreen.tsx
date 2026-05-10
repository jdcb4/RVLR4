import { FinalResultsBody } from "@/components/game/final-results/FinalResultsBody";
import { ResultsConfetti } from "@/components/game/final-results/ResultsConfetti";
import { mapFinalResultsFromWww } from "@/components/game/final-results/viewModel";
import { GamePanel } from "@/components/game/GamePanel";
import type { MatchState } from "@/domain/whowhatwhere/types";

export function ResultsScreen({
  match,
}: {
  readonly match: MatchState;
}) {
  const vm = mapFinalResultsFromWww(match);

  if (!vm) {
    return (
      <section className="relative flex flex-1 flex-col pb-4">
        <GamePanel title="Final Results">
          <p className="text-typ-body text-muted-foreground">No results yet.</p>
        </GamePanel>
      </section>
    );
  }

  return (
    <section className="relative flex flex-1 flex-col pb-4">
      <ResultsConfetti />
      <div className="relative z-10">
        <GamePanel title="Final Results">
          <FinalResultsBody vm={vm} />
        </GamePanel>
      </div>
    </section>
  );
}
