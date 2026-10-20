import { useState } from "react";

import { AccessibleCountdownValue } from "@/components/game/AccessibleCountdownValue";
import { FooterOutlineIconTextButton } from "@/components/game/GameFooterButtons";
import { ModalDialog } from "@/components/ModalDialog";
import { Button } from "@/components/ui/button";
import { formatWhoWhatWhereTurnClock } from "@/domain/whowhatwhere/formatClock";
import { getActiveContext, getCurrentWord } from "@/domain/whowhatwhere/game";
import type { MatchState } from "@/domain/whowhatwhere/types";

/** Focused phone composition: the clue stays visible as the skipped queue grows. */
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
  const [showSkipped, setShowSkipped] = useState(false);
  const turn = match.activeTurn!;
  const { team, describer } = getActiveContext(match);
  const word = getCurrentWord(turn);
  const showHints = match.settings.hints.perTurnLimit > 0 && onRevealHint;

  return (
    <section className="flex min-h-full flex-col gap-3" aria-label="Active turn">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-typ-card-title font-semibold">{team.name} guessing</h2>
          <p className="break-words text-typ-ui text-muted-foreground">
            {describer.name} presenting
          </p>
        </div>
        <p className="shrink-0 text-typ-ui text-muted-foreground">Round {match.roundNumber}</p>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-typ-ui text-muted-foreground">Time left</p>
          <p className="text-typ-display font-semibold tabular-nums">
            <AccessibleCountdownValue
              countdownKey={turn.startedAt}
              formattedValue={formatWhoWhatWhereTurnClock(secondsRemaining)}
              secondsLeft={secondsRemaining}
            />
          </p>
        </div>
        <p className="text-typ-ui text-muted-foreground">
          <span className="font-semibold text-foreground">{turn.score}</span> correct
        </p>
      </div>

      <div className="flex min-h-32 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-semantic-primary-border bg-semantic-primary-soft-bg px-4 py-5 text-center">
        <p className="text-typ-ui text-primary">{turn.category}</p>
        <p className="w-full break-words text-typ-display font-semibold">
          {word?.word ?? "No word"}
        </p>
      </div>

      {showHints ? (
        <div className="grid gap-2">
          {turn.currentWordHintRevealed && word?.hint ? (
            <p aria-live="polite" className="text-center text-typ-ui text-foreground">
              {word.hint}
            </p>
          ) : null}
          <Button
            className="min-h-12 whitespace-normal"
            disabled={turn.hintsRemaining <= 0 || turn.currentWordHintRevealed || !word}
            variant="outline"
            onClick={onRevealHint}
          >
            {turn.currentWordHintRevealed ? "Hint shown" : `Hint (${turn.hintsRemaining} left)`}
          </Button>
        </div>
      ) : null}

      {turn.skippedWords.length > 0 ? (
        <Button
          className="min-h-12 whitespace-normal"
          variant="outline"
          onClick={() => setShowSkipped(true)}
        >
          Return to skipped words ({turn.skippedWords.length})
        </Button>
      ) : null}

      {showSkipped ? (
        <ModalDialog title="Skipped words" onClose={() => setShowSkipped(false)}>
          <p className="mb-3 mt-2 text-typ-ui text-muted-foreground">
            Choose a word to describe now.
          </p>
          <div className="grid gap-2">
            {turn.skippedWords.map((skipped) => (
              <FooterOutlineIconTextButton
                key={skipped.id}
                icon={null}
                label={skipped.word.word}
                onClick={() => {
                  setShowSkipped(false);
                  onReturnSkipped(skipped.id);
                }}
              />
            ))}
          </div>
        </ModalDialog>
      ) : null}
    </section>
  );
}
