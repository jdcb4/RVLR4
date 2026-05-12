import { PrimaryFooterButton } from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import type { ScreenModel } from "@/features/imposter/imposterSingleplayerAppTypes";
import { IMPOSTER_NOTICE_CLASS } from "@/features/imposter/screens/imposterScreenTokens";
import type { ImposterSingleplayerAppController } from "@/features/imposter/useImposterSingleplayerApp";

export function imposterRoundGuideRevealWarningScreen(
  controller: ImposterSingleplayerAppController,
): ScreenModel {
  return {
    content: (
      <GamePanel
        eyebrow="Big reveal"
        subtitle="Everyone should be ready for spoilers."
        title="About to reveal the imposter"
      >
        <p className="text-typ-body text-foreground">
          The next screen shows who was secretly the imposter and what the word was.
        </p>
        <p className={`mt-4 ${IMPOSTER_NOTICE_CLASS}`}>
          Are all players okay moving on — including anyone who should look away until
          you say so?
        </p>
      </GamePanel>
    ),
    actions: (
      <PrimaryFooterButton
        label="Reveal"
        onClick={() => controller.goResults()}
      />
    ),
  };
}
