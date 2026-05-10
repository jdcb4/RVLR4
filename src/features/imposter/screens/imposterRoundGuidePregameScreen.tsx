import { PrimaryFooterButton } from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import type { ScreenModel } from "@/features/imposter/imposterAppTypes";
import { IMPOSTER_NOTICE_CLASS } from "@/features/imposter/screens/imposterScreenTokens";
import type { ImposterAppController } from "@/features/imposter/useImposterApp";

export function imposterRoundGuidePregameScreen(
  controller: ImposterAppController,
): ScreenModel {
  return {
    content: (
      <GamePanel
        eyebrow="Clue round"
        subtitle="Keep the phone away while everyone thinks out loud at the table."
        title="Give your clues"
      >
        <p className="text-typ-body text-foreground">
          Go around the circle <strong>twice</strong>. On each pass, say one short clue
          about the secret word. Imposters should try to sound like everyone else.
        </p>
        <p className={`mt-4 ${IMPOSTER_NOTICE_CLASS}`}>
          When two full rounds of clues are done, come back here and tap the button
          below when you are ready to discuss.
        </p>
      </GamePanel>
    ),
    actions: (
      <PrimaryFooterButton
        label="Ready for discussion"
        onClick={() => controller.goGuidePrediscussion()}
      />
    ),
  };
}
