import { useEffect, useState } from "react";

import { viewerWhoWhatWhereTeamIsWinner } from "@/components/game/final-results/viewModel";
import { TeamStandingsList } from "@/components/game/TeamStandingsList";
import { Metric } from "@/components/Metric";
import { formatWhoWhatWhereTurnClock } from "@/domain/whowhatwhere/formatClock";
import { getActiveContext, getSecondsLeft } from "@/domain/whowhatwhere/game";
import type { MatchState } from "@/domain/whowhatwhere/types";
import { FinalTurnRecapScreen } from "@/features/whowhatwhere/results/FinalTurnRecapScreen";
import { ResultsScreen } from "@/features/whowhatwhere/results/ResultsScreen";
import { ActiveTurnScreen } from "@/features/whowhatwhere/turn/ActiveTurnScreen";
import { ReadyScreen } from "@/features/whowhatwhere/turn/ReadyScreen";
import type { WhoWhatWherePeerRole, WhoWhatWhereSyncDto } from "@/multiplayer/roomTypes";
import { playGameSoundEffect } from "@/services/gameSoundEffects";

type EmitWithAck = (
  event: string,
  body?: unknown,
) => Promise<{ ok?: boolean; error?: string } | undefined>;

function wwwOutcomeTone(match: MatchState, viewerPlayerId: string): "none" | "win" | "lose" {
  const hasResults =
    Boolean(match.results) && (match.stage === "results" || match.stage === "finalSummary");

  if (!hasResults) {
    return "none";
  }

  return viewerWhoWhatWhereTeamIsWinner(match, viewerPlayerId) ? "win" : "lose";
}

export function WhoWhatWhereMultiplayerBody({
  payload,
  viewerPlayerId,
  error,
  showScoresPane,
  emitWithAck,
  setError,
}: {
  readonly payload: WhoWhatWhereSyncDto;
  readonly viewerPlayerId: string;
  readonly error: string;
  readonly showScoresPane: boolean;
  readonly emitWithAck: EmitWithAck;
  readonly setError: (message: string) => void;
}) {
  const { match, role } = payload;

  if (match.stage === "ready") {
    return (
      <ReadyScreen
        error={error}
        handoffRevealed
        match={match}
        presentation="multiplayer"
        viewerPlayerId={viewerPlayerId}
        viewerRole={role}
      />
    );
  }

  if (match.stage === "turn" && match.activeTurn) {
    return role === "describer" ? (
      <DescriberTurnBody emitWithAck={emitWithAck} payload={payload} setError={setError} />
    ) : (
      <GuessOrObserveTurn match={match} role={role} />
    );
  }

  if (match.stage === "finalSummary") {
    return showScoresPane ? (
      <ResultsScreen
        match={match}
        outcomeTone={wwwOutcomeTone(match, viewerPlayerId)}
        showConfetti={viewerWhoWhatWhereTeamIsWinner(match, viewerPlayerId)}
      />
    ) : (
      <FinalTurnRecapScreen match={match} />
    );
  }

  if (match.stage === "results") {
    return (
      <ResultsScreen
        match={match}
        outcomeTone={wwwOutcomeTone(match, viewerPlayerId)}
        showConfetti={viewerWhoWhatWhereTeamIsWinner(match, viewerPlayerId)}
      />
    );
  }

  return null;
}

function DescriberTurnBody({
  payload,
  emitWithAck,
  setError,
}: {
  readonly payload: WhoWhatWhereSyncDto;
  readonly emitWithAck: EmitWithAck;
  readonly setError: (message: string) => void;
}) {
  return (
    <ActiveTurnScreen
      match={payload.match}
      onRevealHint={async () => {
        const ack = await emitWithAck("www:revealHint");

        if (ack?.ok === false) {
          setError(ack.error ?? "");
        }
      }}
      onReturnSkipped={async (skippedWordId) => {
        if (!payload.canReturnSkipped) {
          return;
        }

        const ack = await emitWithAck("www:returnSkipped", { skippedWordId });

        if (ack?.ok === false) {
          setError(ack.error ?? "");
        } else {
          void playGameSoundEffect("returnSkipped");
        }
      }}
    />
  );
}

export function GuessOrObserveTurn({
  match,
  role,
}: {
  readonly match: MatchState;
  readonly role: Exclude<WhoWhatWherePeerRole, "describer">;
}) {
  const activeTurn = match.activeTurn!;
  const context = getActiveContext(match);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((tick) => tick + 1);
    }, 500);

    return () => window.clearInterval(interval);
  }, []);

  const secondsLeft = getSecondsLeft(activeTurn);
  const isGuesser = role === "guesser";

  return (
    <section className="flex flex-1 flex-col gap-4 pb-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-typ-panel-title font-semibold">
          {isGuesser ? "Guess with your team" : "Sit tight"}
        </p>
        <p className="mt-2 text-typ-ui-snug text-muted-foreground">
          {isGuesser
            ? "You do not see the secret words. Listen to your describer and shout guesses together."
            : "Another team is describing right now. Wait for your bench to rotate in."}
        </p>
        <p className="mt-4 font-mono text-typ-display text-foreground">••••••</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-typ-overline text-muted-foreground">Turn snapshot</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Metric label="Time left" value={formatWhoWhatWhereTurnClock(secondsLeft)} />
          <Metric label="Turn score" value={String(activeTurn.score)} />
          <Metric label="Category" value={activeTurn.category} />
          <Metric label="Describer" value={context.describer.name} />
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-typ-ui font-semibold text-foreground">Standings</p>
          <TeamStandingsList teams={match.teams} />
        </div>
      </div>
    </section>
  );
}
