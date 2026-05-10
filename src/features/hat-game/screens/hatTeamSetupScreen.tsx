import { PrimaryFooterButton } from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import { teamRosterAdvanceLabel } from "@/components/team-setup/teamRosterLabels";
import { TeamRosterSetupScreen } from "@/components/team-setup/TeamRosterSetupScreen";
import { hatStateToRosterRows } from "@/domain/hat-game/setup";
import type { ScreenModel } from "@/features/hat-game/hatGameAppTypes";
import type { HatGameAppController } from "@/features/hat-game/useHatGameApp";

export function hatTeamSetupScreen(controller: HatGameAppController): ScreenModel {
  const rosterRows = hatStateToRosterRows(
    controller.snapshot.teams,
    controller.snapshot.players,
  );

  return {
    content: (
      <GamePanel
        className="flex min-h-0 flex-1 flex-col"
        eyebrow={`Team ${controller.snapshot.teamEditIndex + 1} of ${controller.snapshot.teamCount}`}
        subtitle="Edit the roster below. At least two players per team; add seats if needed."
        title="Name this team"
      >
        <TeamRosterSetupScreen
          addPlayerToRoster={controller.addPlayerToHatRosterRows}
          error={controller.error}
          omitHeading
          removePlayerFromRoster={controller.removePlayerFromHatRosterRows}
          teamCount={controller.snapshot.teamCount}
          teamIndex={controller.snapshot.teamEditIndex}
          teams={rosterRows}
          onBack={controller.backTeamStep}
          onTeamsChange={controller.applyHatRosterFromRows}
        />
      </GamePanel>
    ),
    actions: (
      <PrimaryFooterButton
        label={teamRosterAdvanceLabel(
          controller.snapshot.teamEditIndex,
          controller.snapshot.teamCount,
          "Review teams",
        )}
        onClick={controller.confirmTeamStep}
      />
    ),
  };
}
