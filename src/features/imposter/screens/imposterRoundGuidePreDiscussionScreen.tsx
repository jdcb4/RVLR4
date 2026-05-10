import { PrimaryFooterButton } from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import type { ScreenModel } from "@/features/imposter/imposterAppTypes";
import { IMPOSTER_NOTICE_CLASS } from "@/features/imposter/screens/imposterScreenTokens";
import type { ImposterAppController } from "@/features/imposter/useImposterApp";

export function imposterRoundGuidePreDiscussionScreen(
  controller: ImposterAppController,
): ScreenModel {
  return {
    content: (
      <GamePanel
        eyebrow="Discussion & vote"
        subtitle="The app is not tracking votes — your group decides together."
        title="Talk it out, then vote"
      >
        <p className="text-typ-body text-foreground">
          Discuss who felt suspicious. When you are ready, vote at the table on who you
          think is the imposter (use whatever rule your group agrees on).
        </p>
        <p className={`mt-4 ${IMPOSTER_NOTICE_CLASS}`}>
          After voting is settled, tap below before anyone reads the phone again for the
          reveal.
        </p>
      </GamePanel>
    ),
    actions: (
      <PrimaryFooterButton
        label="Vote done"
        onClick={() => controller.goGuideWarning()}
      />
    ),
  };
}
