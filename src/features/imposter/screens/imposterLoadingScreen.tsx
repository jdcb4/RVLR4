import { GamePanel } from "@/components/game/GamePanel";
import type { ScreenModel } from "@/features/imposter/imposterSingleplayerAppTypes";

export function imposterLoadingScreen(): ScreenModel {
  return {
    content: (
      <GamePanel title="Loading saved game…">
        <p className="text-typ-body text-muted-foreground">
          Restoring your session on this device.
        </p>
      </GamePanel>
    ),
  };
}
