import { PrimaryFooterButton } from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import { OptionButton, OptionGroup } from "@/components/setup/OptionGroup";
import { TeamCountOptionGroup } from "@/components/setup/TeamCountOptionGroup";
import type { SharedTeamCount } from "@/config/teamRoster";
import type { ScreenModel } from "@/features/hat-game/hatGameAppTypes";
import type { HatGameAppController } from "@/features/hat-game/useHatGameApp";

export function hatSettingsScreen(controller: HatGameAppController): ScreenModel {
  return {
    content: (
      <GamePanel
        subtitle="Choose teams, timing, skips, and how setup continues before rounds."
        title="Game settings"
      >
        <TeamCountOptionGroup
          value={controller.snapshot.teamCount as SharedTeamCount}
          onChange={controller.updateHatTeamCountSetting}
        />

        <OptionGroup label="Turn length">
          {[30, 45, 60, 75].map((seconds) => (
            <OptionButton
              key={seconds}
              selected={controller.snapshot.turnDurationSeconds === seconds}
              onClick={() => controller.updateHatTurnDurationSeconds(seconds)}
            >
              {seconds}s
            </OptionButton>
          ))}
        </OptionGroup>

        <OptionGroup label="Skips per turn">
          {[1, 2, 3].map((skips) => (
            <OptionButton
              key={skips}
              selected={controller.snapshot.skipsPerTurn === skips}
              onClick={() => controller.updateHatSkipsPerTurn(skips)}
            >
              {skips}
            </OptionButton>
          ))}
        </OptionGroup>
      </GamePanel>
    ),
    actions: (
      <PrimaryFooterButton
        label="Next: Team 1"
        onClick={() => controller.confirmTeamCountAndStartTeamSetup()}
      />
    ),
  };
}
