import type { KeyboardEvent } from "react";

import { IconPlus, IconTrash } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { MAX_PLAYERS_PER_TEAM, MIN_PLAYERS_PER_TEAM } from "@/config/teamRoster";
import {
  addPlayerToTeam,
  removePlayerFromTeam,
  updatePlayerName,
} from "@/domain/whowhatwhere/setup";
import type { TeamSetup } from "@/domain/whowhatwhere/types";

function advanceNameField(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
  event.preventDefault();
  const inputs = Array.from(
    event.currentTarget.closest("section")?.querySelectorAll("input") ?? [],
  );
  const next = inputs[inputs.indexOf(event.currentTarget) + 1];
  if (next) next.focus();
  else event.currentTarget.blur();
}

export function WhoWhatWhereSetupSteps({
  current,
}: {
  readonly current: "settings" | "team" | "review";
}) {
  return (
    <nav aria-label="Setup progress" className="mb-4 flex gap-3 text-typ-ui text-muted-foreground">
      {(
        [
          ["settings", "Settings"],
          ["team", "Teams"],
          ["review", "Review"],
        ] as const
      ).map(([step, label]) => (
        <span
          key={step}
          aria-current={step === current ? "step" : undefined}
          className={step === current ? "font-semibold text-foreground" : undefined}
        >
          {label}
        </span>
      ))}
    </nav>
  );
}

export function WhoWhatWhereDeviceTeamSetup({
  teams,
  teamIndex,
  error,
  onTeamsChange,
}: {
  readonly teams: readonly TeamSetup[];
  readonly teamIndex: number;
  readonly error: string;
  readonly onTeamsChange: (teams: TeamSetup[]) => void;
}) {
  const team = teams[teamIndex];
  if (!team) return null;
  const inputClass =
    "keyboard-safe-input h-12 w-full min-w-0 rounded-md border border-input bg-background px-3 text-typ-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-typ-section-title font-semibold">
          Team {teamIndex + 1} of {teams.length}
        </h2>
      </div>
      <label className="grid gap-1 text-typ-ui font-medium">
        Team name
        <input
          className={inputClass}
          maxLength={24}
          autoCapitalize="words"
          autoComplete="off"
          enterKeyHint="next"
          onKeyDown={advanceNameField}
          value={team.name}
          onChange={(event) =>
            onTeamsChange(
              teams.map((row) => (row.id === team.id ? { ...row, name: event.target.value } : row)),
            )
          }
        />
      </label>
      <p className="mt-1 text-typ-ui font-medium">Players · presenting order</p>
      <div className="space-y-2">
        {team.players.map((player, index) => (
          <div key={player.id} className="flex items-end gap-2">
            <label className="grid min-w-0 flex-1 gap-1 text-typ-ui text-muted-foreground">
              {index === 0 ? "First presenter" : `Presenter ${index + 1}`}
              <input
                className={inputClass}
                maxLength={24}
                autoCapitalize="words"
                autoComplete="off"
                enterKeyHint={index === team.players.length - 1 ? "done" : "next"}
                onKeyDown={advanceNameField}
                value={player.name}
                onChange={(event) =>
                  onTeamsChange(updatePlayerName(teams, team.id, player.id, event.target.value))
                }
              />
            </label>
            {index >= MIN_PLAYERS_PER_TEAM ? (
              <Button
                aria-label={`Remove ${player.name}`}
                size="icon"
                variant="outline"
                onClick={() => onTeamsChange(removePlayerFromTeam(teams, team.id, player.id))}
              >
                <IconTrash aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
          </div>
        ))}
      </div>
      <Button
        className="w-full"
        disabled={team.players.length >= MAX_PLAYERS_PER_TEAM}
        variant="outline"
        onClick={() => onTeamsChange(addPlayerToTeam(teams, team.id))}
      >
        <IconPlus aria-hidden="true" className="size-4" />
        Add player
      </Button>
      {error ? (
        <p role="alert" className="text-typ-ui text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export function WhoWhatWhereDeviceReview({ teams }: { readonly teams: readonly TeamSetup[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-typ-section-title font-semibold">Review teams</h2>
      <ol className="divide-y divide-border">
        {teams.map((team, index) => (
          <li key={team.id} className="space-y-1 py-3">
            <h3 className="break-words text-typ-body font-semibold">
              {index + 1} · {team.name}
            </h3>
            <p className="break-words text-typ-ui text-muted-foreground">
              {team.players.map((player) => player.name).join(" · ")}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
