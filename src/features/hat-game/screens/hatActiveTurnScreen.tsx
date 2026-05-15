import { PrimaryFooterButton, SecondaryFooterButton } from "@/components/game/GameFooterButtons";
import { IconCheck, IconSkipForward } from "@/components/icons";
import type { HatGameSession } from "@/domain/hat-game/types";
import { HatActiveTurnPanel } from "@/features/hat-game/HatActiveTurnPanel";
import type { ScreenModel } from "@/features/hat-game/hatSingleplayerAppTypes";
import type { HatSingleplayerAppController } from "@/features/hat-game/useHatSingleplayerApp";

export function hatActiveTurnScreen(
  controller: HatSingleplayerAppController,
  session: HatGameSession,
): ScreenModel {
  const activeTurn = session.activeTurn;

  return {
    content: (
      <HatActiveTurnPanel
        onReturnSkipped={(poolIndex) =>
          controller.dispatchGameAction({
            type: "return-skipped-clue",
            payload: { poolIndex },
          })
        }
        secondsRemaining={controller.secondsRemaining}
        session={session}
        showPhaseMetric
      />
    ),
    actions: (
      <>
        <SecondaryFooterButton
          disabled={(activeTurn?.skipsRemaining ?? 0) <= 0}
          icon={<IconSkipForward className="size-5" />}
          label="Skip"
          onClick={() => controller.dispatchGameAction({ type: "skip-clue" })}
        />
        <PrimaryFooterButton
          icon={<IconCheck className="size-5" />}
          label="Correct"
          onClick={() => controller.dispatchGameAction({ type: "mark-correct" })}
        />
      </>
    ),
  };
}
