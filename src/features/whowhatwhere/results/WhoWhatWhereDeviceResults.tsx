import { RotateCcw } from "lucide-react";

import type { MatchState, WordHistoryEntry } from "@/domain/whowhatwhere/types";
import { WhoWhatWhereDeviceProgress } from "@/features/whowhatwhere/WhoWhatWhereDeviceProgress";

function recapHistory(history: readonly WordHistoryEntry[]) {
  const pending = new Map<string, number[][]>();
  const resolvedSkips = new Set<number>();

  history.forEach((entry, index) => {
    // History has no skip IDs. Match full clues and consume one pending occurrence,
    // so separate main-deck clues with the same spelling remain separate rows.
    const key = JSON.stringify([entry.word.word, entry.word.category, entry.word.hint]);
    const occurrences = pending.get(key) ?? [];
    if (entry.status === "skipped") {
      if (entry.source === "skipped" && occurrences[0]) occurrences[0].push(index);
      else occurrences.push([index]);
      pending.set(key, occurrences);
    } else if (entry.source === "skipped") {
      for (const skippedIndex of occurrences.shift() ?? []) resolvedSkips.add(skippedIndex);
    }
  });

  return history.filter((_, index) => !resolvedSkips.has(index));
}

export function WhoWhatWhereDeviceStandings({ match }: { readonly match: MatchState }) {
  return (
    <ol className="divide-y divide-border">
      {[...match.teams]
        .sort((a, b) => b.score - a.score)
        .map((team) => (
          <li key={team.id} className="flex items-center justify-between gap-3 py-3 text-typ-body">
            <span className="min-w-0 break-words">
              {match.teamOrder.indexOf(team.id) + 1} · {team.name}
            </span>
            <strong className="tabular-nums">{team.score}</strong>
          </li>
        ))}
    </ol>
  );
}

export function WhoWhatWhereDeviceRecap({ match }: { readonly match: MatchState }) {
  const summary = match.lastTurnSummary;
  if (!summary) return null;
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <WhoWhatWhereDeviceProgress match={match} phase="recap" />
      <h2 className="break-words text-typ-section-title font-semibold">
        {summary.teamName} scored {summary.scoreDelta}.
      </h2>
      <p className="mb-3 text-typ-ui text-muted-foreground">{summary.describerName}</p>
      <ol aria-label="Turn words" className="min-h-0 space-y-1 overflow-y-auto">
        {recapHistory(summary.wordHistory).map((entry, index) => (
          <li
            key={`${index}-${entry.timestamp}`}
            className={`flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-typ-ui ${
              entry.status === "correct"
                ? "bg-card font-medium"
                : "border border-dashed border-semantic-skipped-border bg-semantic-skipped-bg text-semantic-skipped-foreground"
            }`}
          >
            <span className="min-w-0 break-words">{entry.word.word}</span>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-typ-meta">
              {entry.status === "correct" && entry.source === "skipped" ? (
                <RotateCcw className="size-3.5" role="img" aria-label="Replayed" />
              ) : null}
              {entry.status === "correct" ? "Correct" : "Skipped"}
            </span>
          </li>
        ))}
        {summary.finalWord ? (
          <li className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border px-3 py-2.5 text-typ-ui text-muted-foreground">
            <span className="min-w-0 break-words">{summary.finalWord.word}</span>
            <span className="shrink-0 text-typ-meta">Unplayed</span>
          </li>
        ) : null}
      </ol>
      {summary.wordHistory.length === 0 && !summary.finalWord ? (
        <p className="mt-3 text-typ-ui text-muted-foreground">No words played.</p>
      ) : null}
    </section>
  );
}

export function WhoWhatWhereDeviceRoundComplete({ match }: { readonly match: MatchState }) {
  return (
    <section>
      <WhoWhatWhereDeviceProgress match={match} phase="roundComplete" />
      <h2 className="text-typ-section-title font-semibold">
        Round {Math.max(1, match.roundNumber - 1)} complete.
      </h2>
      <WhoWhatWhereDeviceStandings match={match} />
    </section>
  );
}

export function WhoWhatWhereDeviceResults({ match }: { readonly match: MatchState }) {
  const maxScore = Math.max(...match.teams.map((team) => team.score));
  const winners = match.teams.filter((team) => team.score === maxScore).map((team) => team.name);
  const bestScore = Math.max(0, ...match.turnSummaries.map((turn) => turn.scoreDelta));
  const bestTurns = match.turnSummaries
    .filter((turn) => turn.scoreDelta === bestScore)
    .filter(
      (turn, index, rows) =>
        rows.findIndex(
          (other) => other.describerId === turn.describerId && other.teamId === turn.teamId,
        ) === index,
    );
  const skips = new Map<string, { key: string; name: string; team: string; count: number }>();
  for (const turn of match.turnSummaries) {
    const key = `${turn.teamId}:${turn.describerId}`;
    const previous = skips.get(key);
    skips.set(key, {
      key,
      name: turn.describerName,
      team: turn.teamName,
      count: (previous?.count ?? 0) + turn.skippedCount,
    });
  }
  const mostSkips = Math.max(0, ...[...skips.values()].map((player) => player.count));
  const skipLeaders = [...skips.values()].filter((player) => player.count === mostSkips);
  return (
    <section className="space-y-3">
      <h2 className="material-winner break-words text-typ-section-title font-semibold">
        {winners.length === 1 ? `${winners[0]} win.` : `${winners.join(" & ")} tie.`}
      </h2>
      <WhoWhatWhereDeviceStandings match={match} />
      <div className="space-y-4 border-t border-border pt-3">
        <section aria-label="Best turn">
          <h3 className="text-typ-body font-semibold">
            Best turn · {bestScore} {bestScore === 1 ? "point" : "points"}
          </h3>
          {bestTurns.map((turn) => (
            <p
              key={`${turn.teamId}:${turn.describerId}`}
              className="break-words text-typ-ui text-muted-foreground"
            >
              {turn.describerName} · {turn.teamName}
            </p>
          ))}
          {!bestTurns.length ? (
            <p className="text-typ-ui text-muted-foreground">No turns played.</p>
          ) : null}
        </section>
        <section aria-label="Most skips">
          <h3 className="text-typ-body font-semibold">Most skips · {mostSkips}</h3>
          {mostSkips ? (
            skipLeaders.map((player) => (
              <p key={player.key} className="break-words text-typ-ui text-muted-foreground">
                {player.name} · {player.team}
              </p>
            ))
          ) : (
            <p className="text-typ-ui text-muted-foreground">No skips.</p>
          )}
        </section>
      </div>
    </section>
  );
}
