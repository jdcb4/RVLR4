import {
  PrimaryFooterButton,
  SecondaryFooterButton,
} from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import { reviewDisplayRowsFromHat } from "@/components/game/reviewTeamMappers";
import { ReviewTeamsPanel } from "@/components/game/ReviewTeamsPanel";
import type { ScreenModel } from "@/features/hat-game/hatGameAppTypes";
import type { HatGameAppController } from "@/features/hat-game/useHatGameApp";

export function hatReviewTeamsScreen(controller: HatGameAppController): ScreenModel {
  return {
    content: (
      <section className="keyboard-safe-form flex flex-1 flex-col gap-4 pb-4">
        <GamePanel title="Review teams">
          <ReviewTeamsPanel
            teams={reviewDisplayRowsFromHat(
              controller.snapshot.teams,
              controller.snapshot.players,
            )}
          />
        </GamePanel>
        <GamePanel subtitle="Private clue entry" title="Next steps">
          <p className="text-typ-body text-muted-foreground">
            Pass the phone around for private famous figure entry after this.
          </p>
        </GamePanel>
      </section>
    ),
    actions: (
      <>
        <SecondaryFooterButton label="Edit teams" onClick={controller.editTeams} />
        <PrimaryFooterButton
          label="Start famous figure entry"
          onClick={controller.startClueEntry}
        />
      </>
    ),
  };
}
