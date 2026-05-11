import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { viewerWwwTeamIsWinner } from "@/components/game/final-results/viewModel";
import {
  PrimaryFooterButton,
  SecondaryFooterButton,
} from "@/components/game/GameFooterButtons";
import { GameScreenHeaderActions } from "@/components/game/GameScreenHeaderActions";
import { IconCheck, IconSkipForward } from "@/components/icons";
import { Metric } from "@/components/Metric";
import { formatWwwTurnClock } from "@/domain/whowhatwhere/formatClock";
import {
  canQueueSkipped,
  getActiveContext,
  getSecondsLeft,
} from "@/domain/whowhatwhere/game";
import type { MatchState } from "@/domain/whowhatwhere/types";
import {
  MultiplayerEndGameActions,
  MultiplayerGameShell,
} from "@/features/multiplayer/MultiplayerGameShell";
import {
  FinalTurnRecapScreen,
} from "@/features/whowhatwhere/results/FinalTurnRecapScreen";
import { ResultsScreen } from "@/features/whowhatwhere/results/ResultsScreen";
import { ActiveTurnScreen } from "@/features/whowhatwhere/turn/ActiveTurnScreen";
import { ReadyScreen } from "@/features/whowhatwhere/turn/ReadyScreen";
import type { WhoWhatWhereSyncDto } from "@/multiplayer/roomTypes";
import { multiplayerUpNextHeadingTitle } from "@/multiplayer/upNextHeading";
import { playMultiplayerToneCue } from "@/services/multiplayerTone";
import { playSound } from "@/services/whowhatwhereSound";

function wwwOutcomeTone(match: MatchState, viewerPlayerId: string): "none" | "win" | "lose" {
  const hasResults =
    Boolean(match.results) &&
    (match.stage === "results" || match.stage === "finalSummary");

  if (!hasResults) {
    return "none";
  }

  return viewerWwwTeamIsWinner(match, viewerPlayerId) ? "win" : "lose";
}

export function WhoWhatWhereMultiplayerView({
  payload,
  emitWithAck,
  viewerPlayerId,
  isHost,
  replaySync,
}: {
  readonly payload: WhoWhatWhereSyncDto;
  readonly viewerPlayerId: string;
  readonly isHost: boolean;
  readonly replaySync: {
    readonly offerActive: boolean;
    readonly acceptedIds: readonly string[];
    readonly cancelledByDisconnect: boolean;
  };
  readonly emitWithAck: (
    event: string,
    body?: unknown,
  ) => Promise<{ ok?: boolean; error?: string } | undefined>;
}) {
  const match = payload.match;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showScoresPane, setShowScoresPane] = useState(false);
  const warned10Ref = useRef<string | null>(null);
  const timedOutRef = useRef<string | null>(null);

  const role = payload.role;

  const showEndTurn =
    match.stage === "turn" &&
    Boolean(match.activeTurn) &&
    payload.showTurnFooter;

  /** Timer cues for everyone (spectators included). */
  useEffect(() => {
    if (match.stage !== "turn" || !match.activeTurn) {
      warned10Ref.current = null;
      timedOutRef.current = null;

      return undefined;
    }

    const turn = match.activeTurn;
    const interval = window.setInterval(() => {
      const left = getSecondsLeft(turn);

      if (left <= 10 && left > 0 && warned10Ref.current !== turn.startedAt) {
        warned10Ref.current = turn.startedAt;
        void playMultiplayerToneCue("warn10");
      }

      if (left <= 0 && timedOutRef.current !== turn.startedAt) {
        timedOutRef.current = turn.startedAt;
        void playMultiplayerToneCue("timeout");
      }
    }, 400);

    return () => window.clearInterval(interval);
  }, [match.stage, match.activeTurn]);

  const headerRight = (
    <GameScreenHeaderActions
      {...(showEndTurn
        ? {
            endTurn: {
              onClick: async () => {
                setBusy(true);
                const ack = await emitWithAck("www:endTurn");

                if (ack?.ok === false) {
                  setError(ack.error ?? "");
                }

                setBusy(false);
              },
            },
          }
        : {})}
    />
  );

  let footer: ReactNode | undefined;

  if (match.stage === "ready") {
    const waitingContext = getActiveContext(match);
    const viewerTeamId = match.players.find((player) => player.id === viewerPlayerId)?.teamId;
    const nextTeamLabel = multiplayerUpNextHeadingTitle({
      viewerPlayerId,
      viewerTeamId,
      nextTeamId: waitingContext.team.id,
      nextDescriberPlayerId: waitingContext.describer.id,
      nextTeamDisplayName: waitingContext.team.name,
    });

    if (role !== "describer") {
      footer = (
        <PrimaryFooterButton disabled label={nextTeamLabel} onClick={() => {}} />
      );
    } else {
      footer = (
        <PrimaryFooterButton
          disabled={busy}
          label={busy ? "Loading words" : "Start turn"}
          onClick={async () => {
            setBusy(true);
            const ack = await emitWithAck("www:startTurn");

            if (ack?.ok === false) {
              setError(ack.error ?? "");
            }

            setBusy(false);
          }}
        />
      );
    }
  } else if (match.stage === "turn" && match.activeTurn && payload.showTurnFooter) {
    footer = (
      <div className="flex w-full flex-col gap-2">
        <SecondaryFooterButton
          disabled={busy || !canQueueSkipped(match.activeTurn)}
          icon={<IconSkipForward className="size-5" />}
          label="Skip"
          onClick={async () => {
            setBusy(true);
            const ack = await emitWithAck("www:skip");

            if (ack?.ok === false) {
              setError(ack.error ?? "");
            } else {
              void playMultiplayerToneCue("skip");
            }

            setBusy(false);
          }}
        />
        <PrimaryFooterButton
          disabled={busy}
          icon={<IconCheck className="size-5" />}
          label="Correct"
          onClick={async () => {
            setBusy(true);
            const ack = await emitWithAck("www:correct");

            if (ack?.ok === false) {
              setError(ack.error ?? "");
            } else {
              void playMultiplayerToneCue("correct");
            }

            setBusy(false);
          }}
        />
      </div>
    );
  } else if (match.stage === "finalSummary") {
    footer = showScoresPane ? (
      <MultiplayerEndGameActions
        emitWithAck={emitWithAck}
        isHost={isHost}
        replaySync={replaySync}
        viewerPlayerId={viewerPlayerId}
      />
    ) : (
      <PrimaryFooterButton
        disabled={busy}
        label="Final scores"
        onClick={() => {
          setShowScoresPane(true);
        }}
      />
    );
  } else if (match.stage === "results") {
    footer = (
      <MultiplayerEndGameActions
        emitWithAck={emitWithAck}
        isHost={isHost}
        replaySync={replaySync}
        viewerPlayerId={viewerPlayerId}
      />
    );
  }

  let body: ReactNode = null;

  if (match.stage === "ready") {
    body = (
      <ReadyScreen
        error={error}
        handoffRevealed
        match={match}
        presentation="multiplayer"
        viewerPlayerId={viewerPlayerId}
        viewerRole={role}
      />
    );
  } else if (match.stage === "turn" && match.activeTurn) {
    if (role === "describer") {
      body = (
        <ActiveTurnScreen
          match={match}
          onReturnSkipped={async (skippedWordId) => {
            if (!payload.canReturnSkipped) {
              return;
            }

            const ack = await emitWithAck("www:returnSkipped", { skippedWordId });

            if (ack?.ok === false) {
              setError(ack.error ?? "");
            } else {
              playSound("returnSkipped");
            }
          }}
        />
      );
    } else {
      body = <GuessOrObserveTurn match={match} role={role} />;
    }
  } else if (match.stage === "finalSummary") {
    const outcomeTone = wwwOutcomeTone(match, viewerPlayerId);

    body = showScoresPane ? (
      <ResultsScreen
        match={match}
        outcomeTone={outcomeTone}
        showConfetti={viewerWwwTeamIsWinner(match, viewerPlayerId)}
      />
    ) : (
      <FinalTurnRecapScreen match={match} />
    );
  } else if (match.stage === "results") {
    body = (
      <ResultsScreen
        match={match}
        outcomeTone={wwwOutcomeTone(match, viewerPlayerId)}
        showConfetti={viewerWwwTeamIsWinner(match, viewerPlayerId)}
      />
    );
  }

  return (
    <MultiplayerGameShell footer={footer} headerRight={headerRight} title="Who What Where">
      {body}
    </MultiplayerGameShell>
  );
}

function GuessOrObserveTurn({
  match,
  role,
}: {
  readonly match: MatchState;
  readonly role: "guesser" | "observer";
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

  return (
    <section className="flex flex-1 flex-col gap-4 pb-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-typ-panel-title font-semibold">
          {role === "guesser" ? "Guess with your team" : "Sit tight"}
        </p>
        <p className="mt-2 text-typ-ui-snug text-muted-foreground">
          {role === "guesser"
            ? "You do not see the secret words. Listen to your describer and shout guesses together."
            : "Another team is describing right now. Wait for your bench to rotate in."}
        </p>
        <p className="mt-4 font-mono text-typ-display text-foreground">••••••</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-typ-overline text-muted-foreground">Turn snapshot</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Metric label="Time left" value={formatWwwTurnClock(secondsLeft)} />
          <Metric label="Turn score" value={String(activeTurn.score)} />
          <Metric label="Category" value={activeTurn.category} />
          <Metric label="Describer" value={context.describer.name} />
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-typ-ui font-semibold text-foreground">Standings</p>
          <ul className="mt-2 space-y-1 text-typ-ui text-muted-foreground">
            {match.teams.map((team) => (
              <li className="flex justify-between gap-2" key={team.id}>
                <span>{team.name}</span>
                <span className="font-semibold text-foreground">{team.score}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
