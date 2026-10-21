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
      className="mb-4 space-y-2"
    >
      <div aria-hidden="true" className="flex gap-1">
        {Array.from({ length: match.settings.totalRounds }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              index + 1 < round ? "bg-primary/30" : index + 1 === round ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
      <ol
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${match.teamOrder.length}, minmax(0, 1fr))` }}
      >
        {match.teamOrder.map((teamId, index) => {
          const team = match.teams.find((row) => row.id === teamId)!;
          const players = match.players
            .filter((player) => player.teamId === teamId)
            .sort((a, b) => a.seat - b.seat);
          const presenter = players[(match.describerIndexes[teamId] ?? 0) % players.length];
          const complete = index < completedTeams;
          const current = phase === "active" && index === match.teamIndex;
          const next = !complete && !current && index === completedTeams;
          return (
            <li
              key={teamId}
              className={cn(
                "min-w-0 rounded-lg border px-2 py-2 text-typ-micro",
                current
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              <strong className="block break-words font-semibold">
                {index + 1} · {team.name}
              </strong>
              <span className="mt-0.5 block break-words">
                {complete
                  ? "Complete"
                  : current
                    ? `Now · ${presenter?.name ?? ""}`
                    : next || (phase === "active" && index === match.teamIndex + 1)
                      ? `Next · ${presenter?.name ?? ""}`
                      : "Waiting"}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
