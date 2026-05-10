import type { NavigateFunction } from "react-router-dom";

import { FinalResultsBody } from "@/components/game/final-results/FinalResultsBody";
import { ResultsConfetti } from "@/components/game/final-results/ResultsConfetti";
import { mapFinalResultsFromHat } from "@/components/game/final-results/viewModel";
import { GamePanel } from "@/components/game/GamePanel";
import { GameResultActions } from "@/components/GameResultActions";
import type { HatGameSession } from "@/domain/hat-game/types";
import type { ScreenModel } from "@/features/hat-game/hatGameAppTypes";
import type { HatGameAppController } from "@/features/hat-game/useHatGameApp";

export function hatResultsScreen(
  controller: HatGameAppController,
  session: HatGameSession,
  navigate: NavigateFunction,
): ScreenModel {
  const results = session.results;
  const vm = results ? mapFinalResultsFromHat(results) : null;

  return {
    content: (
      <section className="relative flex flex-1 flex-col pb-4">
        <ResultsConfetti />
        <div className="relative z-10">
          <GamePanel title="Final Results">
            {vm ? (
              <FinalResultsBody vm={vm} />
            ) : (
              <p className="text-typ-body text-muted-foreground">No results yet.</p>
            )}
          </GamePanel>
        </div>
      </section>
    ),
    actions: (
      <GameResultActions
        onNewGame={() => void controller.startNewGame()}
        onPickAnotherGame={() => navigate("/")}
        onReplay={controller.playAgain}
      />
    ),
  };
}
