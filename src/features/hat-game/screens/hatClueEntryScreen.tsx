import { FooterIconSlotButton, PrimaryFooterButton } from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import { GAME_DEFAULTS } from "@/config/hatDefaults";
import type { ScreenModel } from "@/features/hat-game/hatSingleplayerAppTypes";
import {
  HAT_CLUE_INPUT_CLASS,
  HAT_NOTICE_CLASS,
} from "@/features/hat-game/screens/hatScreenTokens";
import type { HatSingleplayerAppController } from "@/features/hat-game/useHatSingleplayerApp";
import { keepKeyboardSafeInputVisible } from "@/lib/keyboardSafeInput";

export function hatClueEntryScreen(controller: HatSingleplayerAppController): ScreenModel {
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
        <PrimaryFooterButton label={`${player.name} ready`} onClick={controller.revealClueEntry} />
      ),
    };
  }

  return {
    content: (
      <GamePanel
        className="focus-within:[&_[data-game-panel-subtitle]]:hidden"
        subtitle="Enter people or characters most players could know."
        title={`${player.name}'s famous figures`}
      >
        <div className="grid gap-2">
          {clues.map((clue, index) => (
            <div key={`${player.id}-clue-${index}`} className="flex items-center gap-2">
              <span className="w-5 shrink-0 font-medium tabular-nums text-typ-ui">
                {index + 1}.
              </span>
              <input
                aria-label={`Famous figure ${index + 1}`}
                autoCapitalize="words"
                autoComplete="off"
                className={`${HAT_CLUE_INPUT_CLASS} min-w-0 flex-1`}
                data-hat-clue-index={index}
                enterKeyHint={index < clues.length - 1 ? "next" : "done"}
                inputMode="text"
                maxLength={GAME_DEFAULTS.maxClueLength}
                placeholder="Enter a famous figure"
                spellCheck={false}
                type="text"
                value={clue}
                onChange={(event) => controller.updateClue(player.id, index, event.target.value)}
                onFocus={(event) => keepKeyboardSafeInputVisible(event.currentTarget)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  const nextInput = event.currentTarget
                    .closest("section")
                    ?.querySelector<HTMLInputElement>(`[data-hat-clue-index="${index + 1}"]`);
                  if (nextInput) nextInput.focus();
                  else event.currentTarget.blur();
                }}
              />
              <FooterIconSlotButton
                compact
                icon={<span aria-hidden="true">⚡</span>}
                label={`Suggest famous figure ${index + 1}`}
                onClick={() => controller.fillSuggestion(player.id, index)}
              />
            </div>
          ))}
        </div>
      </GamePanel>
    ),
    actions: (
      <PrimaryFooterButton
        label={
          controller.snapshot.clueEntryIndex >= controller.snapshot.players.length - 1
            ? "Confirm and start game"
            : "Confirm and pass on"
        }
        onClick={controller.confirmClues}
      />
    ),
  };
}
