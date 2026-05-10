import { EditableName } from "@/components/EditableName";
import {
  PrimaryFooterButton,
  SecondaryFooterButton,
} from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import type { ScreenModel } from "@/features/imposter/imposterAppTypes";
import type { ImposterAppController } from "@/features/imposter/useImposterApp";

export function imposterRosterScreen(
  controller: ImposterAppController,
): ScreenModel {
  return {
    content: (
      <GamePanel
        eyebrow={`${controller.snapshot.players.length} players`}
        subtitle="Tap a name to edit it. Only one person should read the screen during each reveal later."
        title="Who is playing?"
      >
        <ul className="space-y-4">
          {controller.snapshot.players.map((player, index) => (
            <li key={player.id}>
              <EditableName
                label={`Player ${index + 1}`}
                value={player.name}
                onChange={(value) => controller.updatePlayerName(player.id, value)}
              />
            </li>
          ))}
        </ul>
      </GamePanel>
    ),
    actions: (
      <>
        <SecondaryFooterButton
          label="Back"
          onClick={() => controller.backToSettings()}
        />
        <PrimaryFooterButton
          label="Next: Review"
          onClick={() => controller.confirmRosterNext()}
        />
      </>
    ),
  };
}
