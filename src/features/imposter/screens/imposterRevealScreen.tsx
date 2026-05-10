import { PrimaryFooterButton } from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import { TurnPlayHighlight } from "@/components/game/TurnPlayHighlight";
import { IMPOSTER_ROLE_CARD_COPY } from "@/config/imposterDefaults";
import type { ScreenModel } from "@/features/imposter/imposterAppTypes";
import { IMPOSTER_NOTICE_CLASS } from "@/features/imposter/screens/imposterScreenTokens";
import type { ImposterAppController } from "@/features/imposter/useImposterApp";

export function imposterRevealScreen(
  controller: ImposterAppController,
): ScreenModel {
  const { snapshot } = controller;
  const round = snapshot.round;
  if (!round) {
    return {
      content: (
        <GamePanel title="Reveal roles">
          <p className={IMPOSTER_NOTICE_CLASS}>No active round. Start from review.</p>
        </GamePanel>
      ),
    };
  }

  const player = snapshot.players[round.revealPlayerIndex];
  if (!player) {
    return { content: null };
  }

  const isImposter = round.imposterPlayerIds.includes(player.id);
  const isLast =
    round.revealPlayerIndex >= snapshot.players.length - 1;

  if (!round.revealRevealed) {
    return {
      content: (
        <GamePanel
          eyebrow={`Secret role ${round.revealPlayerIndex + 1} of ${snapshot.players.length}`}
          subtitle="Pass the phone face-down until it reaches the right person."
          title={`Pass to ${player.name}`}
        >
          <p className={IMPOSTER_NOTICE_CLASS}>
            Only {player.name} should look at the screen for this step.
          </p>
        </GamePanel>
      ),
      actions: (
        <PrimaryFooterButton
          label={`${player.name} ready`}
          onClick={() => controller.revealShowRole()}
        />
      ),
    };
  }

  return {
    content: (
      <GamePanel
        eyebrow={isImposter ? "Your role" : "Remember this"}
        subtitle={
          isImposter
            ? "Blend in during clues — the crew does not know who you are."
            : "Give a clue that proves you know the word without handing it to imposters."
        }
        title={player.name}
      >
        {isImposter ? (
          <TurnPlayHighlight>{IMPOSTER_ROLE_CARD_COPY}</TurnPlayHighlight>
        ) : (
          <TurnPlayHighlight>{round.secretWord}</TurnPlayHighlight>
        )}
      </GamePanel>
    ),
    actions: (
      <PrimaryFooterButton
        label={isLast ? "Continue to clues" : "Confirm and pass on"}
        onClick={() => controller.revealConfirmNext()}
      />
    ),
  };
}
