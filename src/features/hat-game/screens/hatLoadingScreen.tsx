import { GamePanel } from "@/components/game/GamePanel";
import type { ScreenModel } from "@/features/hat-game/hatGameAppTypes";

/** Shown briefly while persisted Hat snapshot loads from storage. */
export function hatLoadingScreen(): ScreenModel {
  return {
    content: (
      <GamePanel subtitle="Loading saved game…" title="Hat Game" />
    ),
  };
}
