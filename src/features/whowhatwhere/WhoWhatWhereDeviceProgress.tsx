import type { MatchState } from "@/domain/whowhatwhere/types";
import { cn } from "@/lib/utils";

/** Informational only: a completed turn keeps its own round after the engine advances. */
export function WhoWhatWhereDeviceProgress({
  match,
  phase = "active",
}: {
  readonly match: MatchState;
  readonly phase?: "active" | "recap" | "roundComplete";
}) {
  const finishedTurns = match.turnSummaries.length;
  const round =
    phase === "active"
      ? Math.min(match.roundNumber, match.settings.totalRounds)
      : Math.max(1, Math.ceil(finishedTurns / match.teamOrder.length));
  const completedTeams =
    phase === "roundComplete"
      ? match.teamOrder.length
      : phase === "recap"
        ? ((finishedTurns - 1) % match.teamOrder.length) + 1
        : match.teamIndex;

  return (
    <section
      aria-label={`Round ${round} of ${match.settings.totalRounds}, team progress`}
      className="mb-4"
    >
      <ol
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${match.teamOrder.length}, minmax(0, 1fr))` }}
      >
        {match.teamOrder.map((teamId, index) => {
          const team = match.teams.find((row) => row.id === teamId)!;
          const complete = index < completedTeams;
          const current = phase === "active" && index === match.teamIndex;
          const next = !complete && !current && index === completedTeams;
          return (
            <li
              key={teamId}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center text-typ-micro",
                current
                  ? "border-semantic-progress-current bg-semantic-progress-current text-semantic-progress-foreground"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full border border-current font-semibold"
                aria-label={`Team ${index + 1}`}
              >
                {index + 1}
              </span>
              <strong
                className="line-clamp-2 h-8 w-full break-words font-semibold leading-4"
                title={team.name}
              >
                {team.name}
              </strong>
              <span>
                {complete
                  ? "Complete"
                  : current
                    ? "Now"
                    : next || (phase === "active" && index === match.teamIndex + 1)
                      ? "Next"
                      : "Waiting"}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
