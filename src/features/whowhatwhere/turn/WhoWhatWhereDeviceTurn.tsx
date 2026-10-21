import { useRef } from "react";

import { AccessibleCountdownValue } from "@/components/game/AccessibleCountdownValue";
import { Button } from "@/components/ui/button";
import { formatWhoWhatWhereTurnClock } from "@/domain/whowhatwhere/formatClock";
import { getCurrentWord } from "@/domain/whowhatwhere/game";
import type { Category, MatchState } from "@/domain/whowhatwhere/types";
import { useWordListOverflow } from "@/features/game-app-hooks/useWordListOverflow";

import { SkippedWordsList } from "./SkippedWordsList";

const categoryPanelClasses: Record<Category, string> = {
  Who: "border-semantic-category-who-border bg-semantic-category-who-bg",
  What: "border-semantic-category-what-border bg-semantic-category-what-bg",
  Where: "border-semantic-category-where-border bg-semantic-category-where-bg",
};

/** The active clue and bounded histories share the phone's available play area. */
export function WhoWhatWhereDeviceTurn({
  match,
  secondsRemaining,
  onReturnSkipped,
  onRevealHint,
}: {
  readonly match: MatchState;
  readonly secondsRemaining: number;
  readonly onReturnSkipped: (id: string) => void;
  readonly onRevealHint?: () => void;
}) {
  const turn = match.activeTurn!;
  const word = getCurrentWord(turn);
  const showHints = match.settings.hints.perTurnLimit > 0 && onRevealHint;
  const guessed = turn.wordHistory.filter((entry) => entry.status === "correct");
  const latestGuessed = [...guessed].reverse();
  const guessedRef = useRef<HTMLDivElement>(null);
  const guessedOverflowCue = useWordListOverflow(guessedRef, latestGuessed);
  const pendingSkipped = turn.currentSkippedWord
    ? [turn.currentSkippedWord, ...turn.skippedWords]
    : turn.skippedWords;

  return (
    <section className="flex min-h-full flex-1 flex-col gap-3" aria-label="Active turn">
      <div className="flex shrink-0 items-end justify-between gap-4">
        <p className="text-[3.5rem] font-semibold leading-none tabular-nums">
          <AccessibleCountdownValue
            countdownKey={turn.startedAt}
            formattedValue={formatWhoWhatWhereTurnClock(secondsRemaining)}
            secondsLeft={secondsRemaining}
          />
        </p>
      </div>

      <div
        className={`material-clue flex min-h-32 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border px-4 py-4 text-center text-foreground ${categoryPanelClasses[turn.category]}`}
        aria-label={`${turn.category} clue`}
      >
        <p className="text-typ-ui font-medium">{turn.category}</p>
        <p className="w-full break-words text-typ-display font-semibold">
          {word?.word ?? "No word"}
        </p>
      </div>

      {showHints ? (
        <div className="h-12 shrink-0">
          {turn.currentWordHintRevealed && word?.hint ? (
            <div
              aria-label="Hint"
              aria-live="polite"
              className="h-full overflow-y-auto overscroll-contain rounded-md border border-input px-3 py-2 text-center text-typ-ui text-foreground [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              role="region"
              // Keyboard users must be able to scroll a long hint inside this fixed-height region.
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
              tabIndex={0}
            >
              {word.hint}
            </div>
          ) : (
            <Button
              className="h-full w-full min-h-12 whitespace-normal"
              disabled={turn.hintsRemaining <= 0 || turn.currentWordHintRevealed || !word}
              variant="outline"
              onClick={onRevealHint}
            >
              {`Hint (${turn.hintsRemaining} left)`}
            </Button>
          )}
        </div>
      ) : null}

      <div className="grid min-h-36 min-w-0 flex-1 grid-cols-2 gap-3">
        <SkippedWordsList
          words={pendingSkipped}
          currentSkippedId={turn.currentSkippedWord?.id}
          onReturnSkipped={onReturnSkipped}
        />
        <section className="flex min-h-0 min-w-0 flex-col" aria-label="Guessed words">
          <h2 className="mb-2 shrink-0 text-typ-ui font-semibold">Guessed · {guessed.length}</h2>
          <div
            ref={guessedRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            tabIndex={latestGuessed.length > 0 ? 0 : undefined}
            role="region"
            aria-label="Latest guessed words"
          >
            {latestGuessed.length > 0 ? (
              <ol>
                {latestGuessed.map((entry, index) => (
                  <li
                    key={`${entry.timestamp}-${index}`}
                    className="flex min-h-12 items-center break-words border-b border-semantic-border-faint py-2 text-typ-ui [overflow-wrap:anywhere]"
                  >
                    {entry.word.word}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-2 text-typ-ui text-muted-foreground">None yet</p>
            )}
          </div>
          <p className="mt-1 min-h-5 shrink-0 text-typ-meta text-muted-foreground">
            {guessedOverflowCue}
          </p>
        </section>
      </div>
    </section>
  );
}
