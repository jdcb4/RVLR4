import {
  FooterIconSlotButton,
  PrimaryFooterButton,
} from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import { GAME_DEFAULTS } from "@/config/hatGameDefaults";
import type { ScreenModel } from "@/features/hat-game/hatGameAppTypes";
import { HAT_CLUE_INPUT_CLASS, HAT_NOTICE_CLASS } from "@/features/hat-game/screens/hatScreenTokens";
import type { HatGameAppController } from "@/features/hat-game/useHatGameApp";

export function hatClueEntryScreen(controller: HatGameAppController): ScreenModel {
  const player = controller.snapshot.players[controller.snapshot.clueEntryIndex];
  if (!player) {
    return { content: null };
  }

  const clues = controller.snapshot.clueSubmissions[player.id]?.clues ?? [];
  if (!controller.snapshot.clueEntryRevealed) {
    return {
      content: (
        <GamePanel
          subtitle={`Figure pack ${controller.snapshot.clueEntryIndex + 1} of ${controller.snapshot.players.length}`}
          title={`Pass to ${player.name}`}
        >
          <p className={HAT_NOTICE_CLASS}>
            Only {player.name} should look at the screen for this step.
          </p>
        </GamePanel>
      ),
      actions: (
        <PrimaryFooterButton
          label={`${player.name} ready`}
          onClick={controller.revealClueEntry}
        />
      ),
    };
  }

  return {
    content: (
      <GamePanel
        subtitle="Enter people or characters most players could know."
        title={`${player.name}'s famous figures`}
      >
        {clues.map((clue, index) => (
          <div
            key={`${player.id}-clue-${index}`}
            className="flex flex-wrap items-center gap-2"
          >
            <span className="w-6 shrink-0 font-medium tabular-nums text-typ-ui">
              {index + 1}.
            </span>
            <input
              className={`${HAT_CLUE_INPUT_CLASS} min-w-0 flex-1`}
              maxLength={GAME_DEFAULTS.maxClueLength}
              placeholder="Enter a famous figure"
              value={clue}
              onChange={(event) =>
                controller.updateClue(player.id, index, event.target.value)
              }
            />
            <FooterIconSlotButton
              icon={<span aria-hidden="true">⚡</span>}
              label="Lightning suggestion"
              onClick={() => controller.fillSuggestion(player.id, index)}
            />
          </div>
        ))}
      </GamePanel>
    ),
    actions: (
      <PrimaryFooterButton
        label={
          controller.snapshot.clueEntryIndex >=
          controller.snapshot.players.length - 1
            ? "Confirm and start game"
            : "Confirm and pass on"
        }
        onClick={controller.confirmClues}
      />
    ),
  };
}
