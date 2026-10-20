import { getActiveContext } from "@/domain/whowhatwhere/game";
import type { MatchState } from "@/domain/whowhatwhere/types";
import { LastTurnCard } from "@/features/whowhatwhere/summary/LastTurnCard";

export function WhoWhatWhereDeviceReady({
  match,
  handoffRevealed,
  error,
}: {
  readonly match: MatchState;
  readonly handoffRevealed: boolean;
  readonly error: string;
}) {
  const { team, describer } = getActiveContext(match);
  return (
    <section className="flex min-h-full flex-col gap-4">
      <div>
        <p className="text-typ-ui text-muted-foreground">
          Round {match.roundNumber} of {match.settings.totalRounds}
        </p>
        <h2 className="mt-1 break-words text-typ-section-title font-semibold">
          {team.name} up next
        </h2>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2 py-3">
        <p className="break-words text-typ-display font-semibold">{describer.name}</p>
        <p className="text-typ-body text-muted-foreground">
          {handoffRevealed
            ? "Start the timer when your team is ready. Keep the words to yourself."
            : "Pass the phone to the describer. Everyone else should look away."}
        </p>
      </div>
      <div className="border-t border-border pt-3">
        <h3 className="mb-2 text-typ-ui font-semibold">Scores</h3>
        <ul className="grid gap-2">
          {match.teams.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-3 text-typ-ui">
              <span className="min-w-0 break-words">{row.name}</span>
              <span className="font-semibold tabular-nums">{row.score}</span>
            </li>
          ))}
        </ul>
      </div>
      {match.lastTurnSummary ? (
        <details>
          <summary className="flex min-h-12 cursor-pointer items-center text-typ-ui font-medium">
            Last turn: +{match.lastTurnSummary.scoreDelta} · View recap
          </summary>
          <LastTurnCard summary={match.lastTurnSummary} />
        </details>
      ) : null}
      {error ? (
        <p role="alert" className="text-typ-ui text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
