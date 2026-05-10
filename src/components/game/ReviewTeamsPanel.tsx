import { cn } from "@/lib/utils";
import { typography } from "@/typography/tiers";

export type ReviewTeamDisplayRow = {
  readonly id: string;
  readonly name: string;
  readonly playerNames: readonly string[];
};

const cardClass =
  "rounded-lg border border-border bg-semantic-muted-panel-bg p-3 text-typ-ui";

/**
 * Shared roster preview used by Hat + WWW review steps.
 */
export function ReviewTeamsPanel({
  teams,
}: {
  readonly teams: readonly ReviewTeamDisplayRow[];
}) {
  return (
    <div className="space-y-3">
      {teams.map((team) => (
        <div key={team.id} className={cardClass}>
          <p className={cn(typography.cardTitle, "font-semibold")}>{team.name}</p>
          <p className="mt-1 text-muted-foreground">
            {team.playerNames.join(", ")}
          </p>
        </div>
      ))}
    </div>
  );
}
