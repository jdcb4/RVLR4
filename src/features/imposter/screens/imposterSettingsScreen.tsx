import { PrimaryFooterButton } from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import { OptionButton, OptionGroup } from "@/components/setup/OptionGroup";
import { IMPOSTER_MAX_PLAYERS, IMPOSTER_MIN_PLAYERS } from "@/config/imposterDefaults";
import type { ScreenModel } from "@/features/imposter/imposterAppTypes";
import type { ImposterAppController } from "@/features/imposter/useImposterApp";

const PLAYER_COUNT_OPTIONS = Array.from(
  { length: IMPOSTER_MAX_PLAYERS - IMPOSTER_MIN_PLAYERS + 1 },
  (_, index) => IMPOSTER_MIN_PLAYERS + index,
);

export function imposterSettingsScreen(
  controller: ImposterAppController,
): ScreenModel {
  const imposterOptions = Array.from(
    { length: controller.maxImposters },
    (_, index) => index + 1,
  );

  return {
    content: (
      <GamePanel
        subtitle="How many people are playing and how many imposters should we secretly assign."
        title="Game settings"
      >
        <OptionGroup label="Players">
          {PLAYER_COUNT_OPTIONS.map((count) => (
            <OptionButton
              key={count}
              selected={controller.snapshot.playerCount === count}
              onClick={() => controller.updatePlayerCount(count)}
            >
              {count}
            </OptionButton>
          ))}
        </OptionGroup>

        <OptionGroup label="Imposters">
          {imposterOptions.map((count) => (
            <OptionButton
              key={count}
              selected={controller.snapshot.imposterCount === count}
              onClick={() => controller.updateImposterCount(count)}
            >
              {count}
            </OptionButton>
          ))}
        </OptionGroup>
      </GamePanel>
    ),
    actions: (
      <PrimaryFooterButton
        label="Next: Name players"
        onClick={() => controller.confirmSettingsNext()}
      />
    ),
  };
}
