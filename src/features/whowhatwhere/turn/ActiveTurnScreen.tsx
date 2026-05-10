import { useEffect, useRef, useState } from "react";

import { FooterOutlineIconTextButton } from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import { TurnPlayHighlight } from "@/components/game/TurnPlayHighlight";
import { Metric } from "@/components/Metric";
import {
  getActiveContext,
  getCurrentWord,
  getSecondsLeft,
} from "@/domain/whowhatwhere/game";
import type { MatchState } from "@/domain/whowhatwhere/types";
import { playSound } from "@/services/whowhatwhereSound";

export function ActiveTurnScreen({
  match,
  onReturnSkipped,
}: {
  readonly match: MatchState;
  readonly onReturnSkipped: (skippedWordId: string) => void;
}) {
  const [, setTick] = useState(0);
  const activeTurn = match.activeTurn!;
  const context = getActiveContext(match);
  const currentWord = getCurrentWord(activeTurn);
  const secondsLeft = getSecondsLeft(activeTurn);
  const warningPlayedForTurn = useRef<string | null>(null);

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
        playSound("warning");
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

        <div className="grid grid-cols-2 gap-3">
          <Metric label="Time left" value={formatSeconds(secondsLeft)} />
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

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return minutes > 0
    ? `${minutes}:${String(remainder).padStart(2, "0")}`
    : `${remainder}`;
}
