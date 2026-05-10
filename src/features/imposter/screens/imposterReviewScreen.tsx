import {
  PrimaryFooterButton,
  SecondaryFooterButton,
} from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import type { ScreenModel } from "@/features/imposter/imposterAppTypes";
import type { ImposterAppController } from "@/features/imposter/useImposterApp";

export function imposterReviewScreen(
  controller: ImposterAppController,
): ScreenModel {
  const { snapshot } = controller;

  return {
    content: (
      <GamePanel
        eyebrow="Ready to deal"
        subtitle={`${snapshot.playerCount} players · ${snapshot.imposterCount} imposter${snapshot.imposterCount === 1 ? "" : "s"} · words drawn from this app`}
        title="Review players"
      >
        <ul className="divide-y divide-border rounded-lg border border-border bg-muted/30">
          {snapshot.players.map((player, index) => (
            <li
              key={player.id}
              className="px-4 py-3 text-typ-body font-medium text-foreground"
            >
              <span className="tabular-nums text-muted-foreground">
                {index + 1}.
              </span>{" "}
              {player.name}
            </li>
          ))}
        </ul>
      </GamePanel>
    ),
    actions: (
      <>
        <SecondaryFooterButton
          label="Edit names"
          onClick={() => controller.backToRoster()}
        />
        <PrimaryFooterButton
          label="Start round"
          onClick={() => controller.confirmReviewStartRound()}
        />
      </>
    ),
  };
}
