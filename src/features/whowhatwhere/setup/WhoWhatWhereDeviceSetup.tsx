import { DeviceTeamSetup } from "@/components/game/DeviceTeamSetup";
import {
  addPlayerToTeam,
  removePlayerFromTeam,
  updatePlayerName,
} from "@/domain/whowhatwhere/setup";
import type { TeamSetup } from "@/domain/whowhatwhere/types";

export {
  DeviceTeamReview as WhoWhatWhereDeviceReview,
  DeviceSetupSteps as WhoWhatWhereSetupSteps,
} from "@/components/game/DeviceTeamSetup";

export function WhoWhatWhereDeviceTeamSetup(props: {
  readonly teams: readonly TeamSetup[];
  readonly teamIndex: number;
  readonly error: string;
  readonly onTeamsChange: (teams: TeamSetup[]) => void;
}) {
  return (
    <DeviceTeamSetup
      {...props}
      onAddPlayer={(teamId) => props.onTeamsChange(addPlayerToTeam(props.teams, teamId))}
      onRemovePlayer={(teamId, playerId) =>
        props.onTeamsChange(removePlayerFromTeam(props.teams, teamId, playerId))
      }
      onPlayerNameChange={(teamId, playerId, name) =>
        props.onTeamsChange(updatePlayerName(props.teams, teamId, playerId, name))
      }
    />
  );
}
