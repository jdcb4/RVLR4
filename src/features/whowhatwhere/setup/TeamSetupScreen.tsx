import { GamePanel } from "@/components/game/GamePanel";
import {
  type RosterTeamRow,
  TeamRosterSetupScreen,
} from "@/components/team-setup/TeamRosterSetupScreen";
import {
  addPlayerToTeam,
  removePlayerFromTeam,
} from "@/domain/whowhatwhere/setup";
import type { GameSettings, TeamSetup } from "@/domain/whowhatwhere/types";

export function TeamSetupScreen({
  settings,
  teamIndex,
  teams,
  error,
  onTeamsChange,
  onBack,
}: {
  readonly settings: GameSettings;
  readonly teamIndex: number;
  readonly teams: readonly TeamSetup[];
  readonly error: string;
  readonly onTeamsChange: (teams: TeamSetup[]) => void;
  readonly onBack: () => void;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <GamePanel
        className="flex min-h-0 flex-1 flex-col"
        eyebrow={`Team ${teamIndex + 1} of ${settings.teamCount}`}
        subtitle="Edit the roster below. At least two players per team; add seats if needed."
        title="Name this team"
      >
        <TeamRosterSetupScreen
          addPlayerToRoster={(rows, teamId) =>
            addPlayerToTeam(rows as readonly TeamSetup[], teamId) as RosterTeamRow[]
          }
          error={error}
          omitHeading
          removePlayerFromRoster={(rows, teamId, playerId) =>
            removePlayerFromTeam(
              rows as readonly TeamSetup[],
              teamId,
              playerId,
            ) as RosterTeamRow[]
          }
          teamCount={settings.teamCount}
          teamIndex={teamIndex}
          teams={teams as readonly RosterTeamRow[]}
          onBack={onBack}
          onTeamsChange={(next) => onTeamsChange(next as TeamSetup[])}
        />
      </GamePanel>
    </section>
  );
}
