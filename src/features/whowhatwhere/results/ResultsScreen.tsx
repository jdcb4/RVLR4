import { useEffect, useRef } from "react";

import { FinalResultsBody } from "@/components/game/final-results/FinalResultsBody";
import { ResultsConfetti } from "@/components/game/final-results/ResultsConfetti";
import { mapFinalResultsFromWhoWhatWhere } from "@/components/game/final-results/viewModel";
import { GamePanel } from "@/components/game/GamePanel";
import type { MatchState } from "@/domain/whowhatwhere/types";
import { playGameSoundEffect } from "@/services/gameSoundEffects";

export function ResultsScreen({
  match,
  showConfetti = true,
  outcomeTone = "none",
}: {
  readonly match: MatchState;
  /** Multiplayer: confetti only on winning team's devices. */
  readonly showConfetti?: boolean;
  /** Multiplayer: short win/lose sting once when results appear. */
  readonly outcomeTone?: "none" | "win" | "lose";
}) {
  const vm = mapFinalResultsFromWhoWhatWhere(match);
  const playedOutcomeRef = useRef(false);

  useEffect(() => {
    if (!vm || outcomeTone === "none" || playedOutcomeRef.current) {
      return;
    }

    playedOutcomeRef.current = true;
    void playGameSoundEffect(outcomeTone === "win" ? "victory" : "defeat");
  }, [vm, outcomeTone]);

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
      {showConfetti ? <ResultsConfetti /> : null}
      <div className="relative z-10">
        <GamePanel title="Final Results">
          <FinalResultsBody vm={vm} />
        </GamePanel>
      </div>
    </section>
  );
}
