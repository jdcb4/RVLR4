import { BetweenTurnsLayout } from "@/components/game/BetweenTurnsLayout";
import { FINAL_TURN_RECAP_NEXT_STEPS } from "@/components/game/finalTurnRecapCopy";
import { PrimaryFooterButton } from "@/components/game/GameFooterButtons";
import { HatLastTurnCard } from "@/components/game/HatLastTurnCard";
import { ReadyNextStepsCard } from "@/components/game/ReadyNextStepsCard";
import { ThatsTheLastTurnCard } from "@/components/game/ThatsTheLastTurnCard";
import type { HatGameSession } from "@/domain/hat-game/types";
import type { ScreenModel } from "@/features/hat-game/hatGameAppTypes";
import type { HatGameAppController } from "@/features/hat-game/useHatGameApp";

export function hatFinalTurnRecapScreen(
  controller: HatGameAppController,
  session: HatGameSession,
): ScreenModel {
  const previousTurn = session.lastTurnSummary;

  return {
    content: (
      <BetweenTurnsLayout
        banner={<ThatsTheLastTurnCard />}
        lastTurnCard={
          previousTurn ? <HatLastTurnCard summary={previousTurn} /> : null
        }
        nextSteps={
          <ReadyNextStepsCard primaryText={FINAL_TURN_RECAP_NEXT_STEPS} />
        }
      />
    ),
    actions: (
      <PrimaryFooterButton
        label="Final scores"
        onClick={() => controller.dispatchGameAction({ type: "view-results" })}
      />
    ),
  };
}
