import type { ReactNode } from "react";

/**
 * Shared vertical stack for **Between turns (ready)** and **Final turn recap** on WWW and Hat.
 * Slots are optional except `nextSteps` when that card is shown — omit unused slots per screen.
 */
export type BetweenTurnsLayoutProps = {
  /** Optional celebration layer (position within section when used). */
  readonly confetti?: ReactNode;
  /** Top emphasis (e.g. **That’s the last turn** on final recap). */
  readonly banner?: ReactNode;
  /** Heading row — typically `GamePanel` (“Team up next”). */
  readonly heading?: ReactNode;
  /** Last-turn performance recap (`LastTurnCard` / `HatLastTurnCard`). */
  readonly lastTurnCard?: ReactNode;
  /** Round or phase strip (`ReadyProgressCard`). */
  readonly progressCard?: ReactNode;
  /** Team scores (`Scoreboard` / `HatScoreboard`). */
  readonly scoreboard?: ReactNode;
  /** Pass-the-phone / primary instructions (`ReadyNextStepsCard`). */
  readonly nextSteps: ReactNode;
  /** Trailing content (e.g. WWW ready inline error below the stack). */
  readonly tail?: ReactNode;
};

export function BetweenTurnsLayout({
  confetti,
  banner,
  heading,
  lastTurnCard,
  progressCard,
  scoreboard,
  nextSteps,
  tail,
}: BetweenTurnsLayoutProps) {
  return (
    <section className="relative flex flex-1 flex-col gap-4 pb-4">
      {confetti}
      {banner}
      {heading}
      {lastTurnCard}
      {progressCard}
      {scoreboard}
      {nextSteps}
      {tail}
    </section>
  );
}
