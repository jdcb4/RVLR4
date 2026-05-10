import { EditableName } from "@/components/EditableName";
import { IconArrowLeft, IconPlus, IconTrash } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { MAX_PLAYERS_PER_TEAM, MIN_PLAYERS_PER_TEAM } from "@/config/teamRoster";
import type { RosterTeamRow } from "@/domain/shared/rosterRow";

export type { RosterTeamRow };

/**
 * Pass-and-play flow: one team at a time, editable names, add/remove players within limits.
 * Primary “Next team / Start round” lives in `GameShell` footer — callers supply it there.
 * Callers supply how add/remove mutate the roster (WWW vs Hat name generation).
 */
export function TeamRosterSetupScreen({
  teamCount,
  teamIndex,
  teams,
  error,
  onTeamsChange,
  onBack,
  addPlayerToRoster,
  removePlayerFromRoster,
  omitHeading = false,
}: {
  readonly teamCount: number;
  readonly teamIndex: number;
  readonly teams: readonly RosterTeamRow[];
  readonly error: string;
  readonly onTeamsChange: (next: RosterTeamRow[]) => void;
  readonly onBack: () => void;
  /** e.g. “Finalise teams” (WWW) or “Review teams” (Hat Game) — used only by parent footer labels. */
  readonly omitHeading?: boolean;
  readonly addPlayerToRoster: (
    teams: readonly RosterTeamRow[],
    teamId: string,
  ) => RosterTeamRow[];
  readonly removePlayerFromRoster: (
    teams: readonly RosterTeamRow[],
    teamId: string,
    playerId: string,
  ) => RosterTeamRow[];
}) {
  const team = teams[teamIndex];
  if (!team) {
    return null;
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="keyboard-safe-form min-h-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto pb-4">
        <button
          className="flex w-fit items-center gap-2 font-medium text-typ-ui text-muted-foreground"
          onClick={onBack}
          type="button"
        >
          <IconArrowLeft className="size-4" aria-hidden="true" />
          Back
        </button>

        {omitHeading ? null : (
          <div className="space-y-2">
            <p className="font-medium text-typ-ui text-primary">
              Team {teamIndex + 1} of {teamCount}
            </p>
            <h2 className="font-semibold text-typ-section-title">
              Name this team
            </h2>
          </div>
        )}

        <EditableName
          label="Team name"
          value={team.name}
          onChange={(value) =>
            onTeamsChange(
              teams.map((row) =>
                row.id === team.id ? { ...row, name: value } : row,
              ),
            )
          }
        />

        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-typ-ui">Players</h3>
            <p className="text-typ-ui text-muted-foreground">
              {team.players.length}/{MAX_PLAYERS_PER_TEAM}
            </p>
          </div>

          {team.players.map((player, playerIndex) => (
            <div
              key={player.id}
              className="flex min-w-0 max-w-full items-center gap-2"
            >
              <span className="w-7 shrink-0 text-right font-semibold text-typ-ui text-muted-foreground">
                {playerIndex + 1}.
              </span>
              <div className="min-w-0 flex-1">
                <EditableName
                  className="w-full"
                  hideLabel
                  label={`Player ${playerIndex + 1}`}
                  value={player.name}
                  onChange={(value) =>
                    onTeamsChange(
                      teams.map((row) =>
                        row.id !== team.id
                          ? row
                          : {
                              ...row,
                              players: row.players.map((p) =>
                                p.id === player.id ? { ...p, name: value } : p,
                              ),
                            },
                      ),
                    )
                  }
                />
              </div>
              {playerIndex >= MIN_PLAYERS_PER_TEAM && (
                <Button
                  aria-label={`Remove ${player.name}`}
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    onTeamsChange(
                      removePlayerFromRoster(teams, team.id, player.id),
                    )
                  }
                >
                  <IconTrash className="size-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          className="h-11 w-full"
          variant="outline"
          disabled={team.players.length >= MAX_PLAYERS_PER_TEAM}
          onClick={() => onTeamsChange(addPlayerToRoster(teams, team.id))}
          type="button"
        >
          <IconPlus className="size-4" aria-hidden="true" />
          Add player
        </Button>

        {error ? (
          <p className="rounded-md border border-semantic-destructive-border-soft bg-semantic-destructive-surface-soft p-3 text-typ-ui text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
