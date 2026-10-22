import { RotateCcw } from "lucide-react";
import { useRef } from "react";

import { AccessibleCountdownValue } from "@/components/game/AccessibleCountdownValue";
import { GameArtwork } from "@/components/GameArtwork";
import { Button } from "@/components/ui/button";
import { getHatGameContext, getHatGamePhaseMeta } from "@/domain/hat-game/engine";
import { formatCountdown } from "@/domain/hat-game/time";
import type { HatGameSession } from "@/domain/hat-game/types";
import { useWordListOverflow } from "@/features/game-app-hooks/useWordListOverflow";
import { hatDeviceRecapHistory } from "@/features/hat-game/hatDeviceRecap";

export function HatDeviceProgress({ match }: { readonly match: HatGameSession }) {
  return (
    <ol
      aria-label="Team scores"
      className="mb-4 grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${match.teamOrder.length}, minmax(0, 1fr))` }}
    >
      {match.teamOrder.map((id, index) => {
        const team = match.teams.find((row) => row.id === id)!;
        const current = index === match.teamIndex;
        return (
          <li
            key={id}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center text-typ-micro ${
              current
                ? "border-semantic-progress-current bg-semantic-progress-current text-semantic-progress-foreground"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            <span className="flex size-7 items-center justify-center rounded-full border border-current font-semibold">
              {index + 1}
            </span>
            <strong className="line-clamp-2 h-8 w-full break-words leading-4" title={team.name}>
              {team.name}
            </strong>
            <span>
              {team.score} points{current ? " · Next" : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function HatDeviceReady({ match }: { readonly match: HatGameSession }) {
  const context = getHatGameContext(match);
  const phase = getHatGamePhaseMeta(match.phaseNumber);
  return (
    <section className="flex min-h-full flex-col">
      <HatDeviceProgress match={match} />
      <div className="flex flex-1 flex-col justify-center gap-3 pb-4">
        <div className="flex items-center gap-3">
          <GameArtwork game="hat" className="size-12 shrink-0" />
          <div className="min-w-0 space-y-3">
            <h2 className="material-callout break-words text-typ-section-title font-semibold">
              Pass to {context.activeDescriberName}.
            </h2>
            <p className="break-words text-typ-body">{context.activeTeam?.name} guessing</p>
          </div>
        </div>
        <h3 className="mt-3 text-typ-body font-semibold">
          Phase {match.phaseNumber}: {phase.name}
        </h3>
        <p className="text-typ-body text-muted-foreground">{phase.instruction}</p>
        <p className="text-typ-ui text-muted-foreground">
          The same figures return in every phase. When the hat empties, keep playing the next phase
          with your remaining time.
        </p>
      </div>
    </section>
  );
}

export function HatDeviceTurn({
  match,
  seconds,
  saving,
  onReturnSkipped,
}: {
  readonly match: HatGameSession;
  readonly seconds: number;
  readonly saving: boolean;
  readonly onReturnSkipped: (index: number) => void;
}) {
  const turn = match.activeTurn!;
  const phase = getHatGamePhaseMeta(match.phaseNumber);
  const clue = turn.clueQueue[turn.queueIndex];
  const guessed = turn.clueHistory.filter((entry) => entry.status === "correct").reverse();
  const pendingSkipped =
    clue && turn.currentSkippedCluePoolIndex === clue.poolIndex
      ? [clue, ...turn.skippedClues]
      : turn.skippedClues;
  const skippedRef = useRef<HTMLDivElement>(null);
  const guessedRef = useRef<HTMLOListElement>(null);
  const skippedOverflow = useWordListOverflow(skippedRef, pendingSkipped);
  const guessedOverflow = useWordListOverflow(guessedRef, guessed);
  return (
    <section aria-label="Active turn" className="flex min-h-full flex-1 flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <p className="text-[3.5rem] font-semibold leading-none tabular-nums">
          <AccessibleCountdownValue
            countdownKey={turn.startedAt}
            formattedValue={formatCountdown(seconds)}
            secondsLeft={seconds}
          />
        </p>
        <p className="text-right text-typ-ui font-semibold" aria-live="polite">
          Phase {match.phaseNumber}
          <br />
          {phase.name}
        </p>
      </div>
      <p className="min-h-10 text-typ-ui text-muted-foreground">{phase.instruction}</p>
      <div
        aria-label="Famous figure"
        className="material-clue flex min-h-32 shrink-0 items-center justify-center rounded-xl border border-semantic-category-who-border bg-semantic-category-who-bg px-4 py-4 text-center"
      >
        <p className="w-full break-words text-typ-display font-semibold">
          {saving ? "Saving figure…" : clue?.text}
        </p>
      </div>
      <div className="grid min-h-32 flex-1 grid-cols-2 gap-3">
        <section className="flex min-h-0 min-w-0 flex-col" aria-label="Skipped figures">
          <h2 className="mb-2 text-typ-ui font-semibold">Skipped · {pendingSkipped.length}</h2>
          <div
            ref={skippedRef}
            role="region"
            aria-label="Waiting skipped figures"
            // Keyboard users must be able to scroll the bounded list independently.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={pendingSkipped.length ? 0 : undefined}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {pendingSkipped.length ? (
              <ol className="space-y-1">
                {pendingSkipped.map((entry) => (
                  <li key={entry.poolIndex}>
                    <Button
                      className="h-auto min-h-12 w-full justify-start whitespace-normal px-2 text-left text-semantic-skipped-foreground"
                      variant="outline"
                      disabled={saving || turn.currentSkippedCluePoolIndex === entry.poolIndex}
                      onClick={() => onReturnSkipped(entry.poolIndex)}
                    >
                      <RotateCcw className="size-4 shrink-0" />
                      <span className="min-w-0 break-words">{entry.text}</span>
                      {turn.currentSkippedCluePoolIndex === entry.poolIndex ? (
                        <span className="shrink-0 text-typ-meta">In play</span>
                      ) : null}
                    </Button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-2 text-typ-ui text-muted-foreground">None waiting</p>
            )}
          </div>
          <p className="mt-1 min-h-5 shrink-0 text-typ-meta text-muted-foreground">
            {skippedOverflow}
          </p>
        </section>
        <section className="flex min-h-0 min-w-0 flex-col" aria-label="Guessed figures">
          <h2 className="mb-2 text-typ-ui font-semibold">Guessed · {guessed.length}</h2>
          <ol
            ref={guessedRef}
            role="region"
            aria-label="Latest guessed figures"
            // Keyboard users must be able to scroll the bounded list independently.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={guessed.length ? 0 : undefined}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {guessed.map((entry, index) => (
              <li
                key={`${entry.phaseNumber}-${entry.poolIndex}-${index}`}
                className="min-h-12 break-words border-b border-border py-2 text-typ-ui"
              >
                {entry.clue}
              </li>
            ))}
            {!guessed.length ? (
              <li className="py-2 text-typ-ui text-muted-foreground">None yet</li>
            ) : null}
          </ol>
          <p className="mt-1 min-h-5 shrink-0 text-typ-meta text-muted-foreground">
            {guessedOverflow}
          </p>
        </section>
      </div>
    </section>
  );
}

export function HatDeviceRecap({ match }: { readonly match: HatGameSession }) {
  const summary = match.lastTurnSummary;
  if (!summary) return null;
  const unplayedIndex = match.lastSeenCluePoolIndex;
  const unplayed =
    !summary.phaseCompleted && unplayedIndex != null ? match.cluePool[unplayedIndex] : undefined;
  // The unfinished figure may already have a skipped row in this phase.
  const history = hatDeviceRecapHistory(summary.clues).filter(
    (entry) =>
      !(
        unplayed &&
        entry.status === "skipped" &&
        entry.poolIndex === unplayedIndex &&
        (entry.phaseNumber ?? 1) === match.phaseNumber
      ),
  );
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <h2 className="break-words text-typ-section-title font-semibold">
        {summary.teamName} scored {summary.scoreDelta}.
      </h2>
      <p className="text-typ-ui text-muted-foreground">{summary.describerName} · Turn recap</p>
      <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto" aria-label="Turn figures">
        {history.map((entry, index) => (
          <li
            key={index}
            className={`flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-typ-ui ${entry.status === "correct" ? "bg-card" : "bg-semantic-skipped-bg text-semantic-skipped-foreground"}`}
          >
            <span className="min-w-0 break-words">
              {entry.clue}
              <span className="block text-typ-meta text-muted-foreground">
                {getHatGamePhaseMeta(entry.phaseNumber ?? 1).name}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-typ-meta">
              {entry.replayed ? (
                <RotateCcw className="size-3.5" aria-label="Replayed" role="img" />
              ) : null}
              {entry.status === "correct" ? "Correct" : "Skipped"}
            </span>
          </li>
        ))}
        {unplayed ? (
          <li className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border px-3 py-2.5 text-typ-ui text-muted-foreground">
            <span className="min-w-0 break-words">
              {unplayed.text}
              <span className="block text-typ-meta">
                {getHatGamePhaseMeta(match.phaseNumber).name}
              </span>
            </span>
            <span className="shrink-0 text-typ-meta">Unplayed</span>
          </li>
        ) : null}
      </ol>
      {!summary.clues.length && !unplayed ? (
        <p className="text-typ-ui text-muted-foreground">No figures played.</p>
      ) : null}
      {match.stage === "ready" ? (
        <p className="text-typ-ui">
          Next: Phase {match.phaseNumber}, {getHatGamePhaseMeta(match.phaseNumber).name}
        </p>
      ) : null}
    </section>
  );
}

export function HatDeviceResults({ match }: { readonly match: HatGameSession }) {
  const teams = [...match.teams].sort((a, b) => b.score - a.score);
  const winners = teams.filter((team) => team.score === teams[0]?.score);
  const bestTurn = match.results?.bestTurn ?? match.bestTurnSummary;
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <GameArtwork game="hat" className="size-10 shrink-0" />
        <h2 className="material-winner min-w-0 break-words text-typ-section-title font-semibold">
          {winners.length > 1 ? "A shared victory." : `${winners[0]?.name} wins!`}
        </h2>
      </div>
      <p className="text-typ-body text-muted-foreground">All three phases complete.</p>
      <ol className="divide-y divide-border" aria-label="Final scores">
        {teams.map((team) => (
          <li key={team.id} className="flex items-center justify-between gap-3 py-3 text-typ-body">
            <span className="min-w-0 break-words">{team.name}</span>
            <strong className="tabular-nums">{team.score}</strong>
          </li>
        ))}
      </ol>
      {bestTurn ? (
        <section aria-label="Best turn" className="space-y-1 border-t border-border pt-3">
          <h3 className="text-typ-body font-semibold">
            Best turn · {bestTurn.score} {bestTurn.score === 1 ? "point" : "points"}
          </h3>
          <p className="break-words text-typ-ui text-muted-foreground">
            {bestTurn.describerName} · {bestTurn.teamName}
          </p>
          <p className="text-typ-ui text-muted-foreground">{bestTurn.phaseName}</p>
        </section>
      ) : null}
    </section>
  );
}
