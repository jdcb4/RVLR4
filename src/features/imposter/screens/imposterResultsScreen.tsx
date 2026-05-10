import type { NavigateFunction } from "react-router-dom";

import { GamePanel } from "@/components/game/GamePanel";
import { GameResultActions } from "@/components/GameResultActions";
import type { ScreenModel } from "@/features/imposter/imposterAppTypes";
import type { ImposterAppController } from "@/features/imposter/useImposterApp";

export function imposterResultsScreen(
  controller: ImposterAppController,
  navigate: NavigateFunction,
): ScreenModel {
  const round = controller.snapshot.round;
  const players = controller.snapshot.players;

  const imposterNames =
    round?.imposterPlayerIds
      .map((id) => players.find((player) => player.id === id)?.name ?? id)
      .join(", ") ?? "—";

  const secretWord = round?.secretWord ?? "—";

  return {
    content: (
      <GamePanel
        eyebrow="Round reveal"
        subtitle="Resolve winners and any final guess together at the table."
        title="Imposter & word"
      >
        <div className="space-y-6">
          <div>
            <p className="text-typ-overline font-semibold uppercase tracking-wide text-muted-foreground">
              Imposter
            </p>
            <p className="mt-2 text-typ-display font-bold text-foreground">
              {imposterNames}
            </p>
          </div>
          <div>
            <p className="text-typ-overline font-semibold uppercase tracking-wide text-muted-foreground">
              Secret word
            </p>
            <p className="mt-2 text-typ-display font-bold text-foreground">
              {secretWord}
            </p>
          </div>
        </div>
      </GamePanel>
    ),
    actions: (
      <GameResultActions
        onNewGame={() => controller.newGameKeepGameType()}
        onPickAnotherGame={() => navigate("/")}
        onReplay={() => controller.replaySamePlayers()}
      />
    ),
  };
}
