import {
  PrimaryFooterButton,
  SecondaryFooterButton,
} from "@/components/game/GameFooterButtons";
import { LandingScreenLayout } from "@/components/game/LandingScreenLayout";
import { ResumeGameCard } from "@/components/game/ResumeGameCard";
import type { ScreenModel } from "@/features/imposter/imposterAppTypes";
import type { ImposterAppController } from "@/features/imposter/useImposterApp";
import { formatSavedAt } from "@/lib/formatSavedAt";

export function imposterLandingScreen(
  controller: ImposterAppController,
): ScreenModel {
  return {
    content: (
      <LandingScreenLayout
        confirmDestructiveSlot={
          controller.confirmNewGame ? (
            <p className="font-medium text-typ-ui text-destructive">
              Start a new game? This will discard the saved game on this device.
            </p>
          ) : null
        }
        resumeSlot={
          controller.savedRecord && !controller.confirmNewGame ? (
            <ResumeGameCard
              savedAtLabel={formatSavedAt(controller.savedRecord.lastSavedAt)}
              onResume={controller.resumeSavedGame}
            />
          ) : null
        }
        subtitle="Most players share one secret word in their heads — imposters try to blend in. Pass one phone around the table; this app deals roles and keeps everyone on the same beat."
        title="Imposter"
      />
    ),
    actions: controller.confirmNewGame ? (
      <>
        <SecondaryFooterButton
          label="Cancel"
          onClick={() => controller.setConfirmNewGame(false)}
        />
        <PrimaryFooterButton
          label="Discard saved game"
          onClick={() => void controller.startNewGame()}
        />
      </>
    ) : controller.savedRecord ? (
      <PrimaryFooterButton
        label="Start new game"
        onClick={() => controller.setConfirmNewGame(true)}
      />
    ) : (
      <PrimaryFooterButton
        label="Start game"
        onClick={() => void controller.startNewGame()}
      />
    ),
  };
}
