import { useEffect, useRef, useState } from "react";

import { FooterOutlineIconTextButton } from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import { TurnPlayHighlight } from "@/components/game/TurnPlayHighlight";
import { Metric } from "@/components/Metric";
import { Button } from "@/components/ui/button";
import { formatWhoWhatWhereTurnClock } from "@/domain/whowhatwhere/formatClock";
import {
  getActiveContext,
  getCurrentWord,
  getSecondsLeft,
} from "@/domain/whowhatwhere/game";
import type { MatchState } from "@/domain/whowhatwhere/types";
import { playGameSoundEffect } from "@/services/gameSoundEffects";

export function ActiveTurnScreen({
  match,
  onReturnSkipped,
  onRevealHint,
}: {
  readonly match: MatchState;
  readonly onReturnSkipped: (skippedWordId: string) => void;
  /**
   * Reveal the hint for the current word. Optional so callers without hints
   * enabled can omit it; when omitted the hint button is hidden entirely.
   */
  readonly onRevealHint?: () => void;
}) {
  const [, setTick] = useState(0);
  const activeTurn = match.activeTurn!;
  const context = getActiveContext(match);
  const currentWord = getCurrentWord(activeTurn);
  const secondsLeft = getSecondsLeft(activeTurn);
  const warningPlayedForTurn = useRef<string | null>(null);
  const hintsConfigured = match.settings.hints.perTurnLimit > 0;
  const hintsRemaining = activeTurn.hintsRemaining;
  const hintRevealed = activeTurn.currentWordHintRevealed;
  const hintText = currentWord?.hint ?? "";
  const canShowHintButton = hintsConfigured && Boolean(onRevealHint);
  const hintButtonDisabled = hintsRemaining <= 0 || hintRevealed || !currentWord;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((tick) => tick + 1);

      const currentSecondsLeft = getSecondsLeft(activeTurn);

      if (
        currentSecondsLeft <= 10 &&
        currentSecondsLeft > 0 &&
        warningPlayedForTurn.current !== activeTurn.startedAt
      ) {
        warningPlayedForTurn.current = activeTurn.startedAt;
        void playGameSoundEffect("warn10");
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [activeTurn]);

  return (
    <section className="flex flex-1 flex-col gap-5 pb-4">
      <GamePanel
        subtitle={`${context.describer.name} is presenting`}
        title={`${context.team.name} guessing`}
      >
        <TurnPlayHighlight>
          {currentWord?.word ?? "No word"}
        </TurnPlayHighlight>

        {canShowHintButton && (
          <div className="flex flex-col items-center gap-2">
            <Button
              aria-label={
                hintRevealed
                  ? "Hint already revealed for this word"
                  : `Reveal hint (${hintsRemaining} left)`
              }
              disabled={hintButtonDisabled}
              size="sm"
              variant="outline"
              onClick={() => onRevealHint?.()}
            >
              Hint ({hintsRemaining} left)
            </Button>
            {hintRevealed && hintText.length > 0 && (
              <p
                aria-live="polite"
                className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-center text-typ-ui italic text-muted-foreground"
              >
                {hintText}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Metric label="Time left" value={formatWhoWhatWhereTurnClock(secondsLeft)} />
          <Metric label="Category" value={activeTurn.category} />
          <Metric label="Score" value={String(activeTurn.score)} />
          <Metric
            label="Skipped waiting"
            value={String(activeTurn.skippedWords.length)}
          />
        </div>

        <p className="text-typ-ui text-muted-foreground">
          Keep going until time runs out or tap{" "}
          <span className="font-medium text-foreground">End turn</span> in the
          header.
        </p>

        {(activeTurn.currentWordSource === "skipped" ||
          activeTurn.skippedWords.length > 0) && (
          <div className="rounded-lg border border-dashed border-border p-3">
            <p className="mb-2 font-semibold text-typ-ui">
              {activeTurn.currentWordSource === "skipped"
                ? "Working through skipped words"
                : "Skipped words waiting"}
            </p>
            <p className="mb-3 text-typ-ui text-muted-foreground">
              Pick a waiting word to return to it now.
            </p>
            <div className="grid gap-2">
              {activeTurn.skippedWords.map((skippedWord) => (
                <FooterOutlineIconTextButton
                  key={skippedWord.id}
                  icon={<span aria-hidden="true">↶</span>}
                  label={skippedWord.word.word}
                  onClick={() => onReturnSkipped(skippedWord.id)}
                />
              ))}
            </div>
          </div>
        )}
      </GamePanel>
    </section>
  );
}
