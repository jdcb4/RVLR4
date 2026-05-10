import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { FooterActionLockContext } from "@/components/footerActionLockContext";
import { BetweenTurnsLayout } from "@/components/game/BetweenTurnsLayout";
import { FinalResultsBody } from "@/components/game/final-results/FinalResultsBody";
import { ResultsConfetti } from "@/components/game/final-results/ResultsConfetti";
import { mapFinalResultsFromHat } from "@/components/game/final-results/viewModel";
import { FINAL_TURN_RECAP_NEXT_STEPS } from "@/components/game/finalTurnRecapCopy";
import {
  FooterOutlineIconTextButton,
  PrimaryFooterButton,
  SecondaryFooterButton,
} from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import { GameScreenHeaderActions } from "@/components/game/GameScreenHeaderActions";
import { HatLastTurnCard } from "@/components/game/HatLastTurnCard";
import { ReadyNextStepsCard } from "@/components/game/ReadyNextStepsCard";
import { ReadyProgressCard } from "@/components/game/ReadyProgressCard";
import { ThatsTheLastTurnCard } from "@/components/game/ThatsTheLastTurnCard";
import { TurnPlayHighlight } from "@/components/game/TurnPlayHighlight";
import { GameResultActions } from "@/components/GameResultActions";
import { GameShell } from "@/components/GameShell";
import { IconCheck, IconSkipForward } from "@/components/icons";
import { Metric } from "@/components/Metric";
import {
  getHatGameContext,
  getHatGamePhaseMeta,
} from "@/domain/hat-game/engine";
import { formatCountdown, getCountdownSeconds } from "@/domain/hat-game/time";
import type { HatGameSession } from "@/domain/hat-game/types";
import { HatScoreboard } from "@/features/hat-game/screens/HatScoreboard";
import { HAT_NOTICE_CLASS } from "@/features/hat-game/screens/hatScreenTokens";
import type { HatSyncDto } from "@/multiplayer/roomTypes";

export function HatMultiplayerView({
  payload,
  emitWithAck,
}: {
  readonly payload: HatSyncDto;
  readonly emitWithAck: (
    event: string,
    body?: unknown,
  ) => Promise<{ ok?: boolean; error?: string } | undefined>;
}) {
  const navigate = useNavigate();
  const session = payload.session;
  const role = payload.role;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const activeTurn = session.activeTurn;
  const endsAt = activeTurn?.endsAt;

  useEffect(() => {
    if (session.stage !== "turn" || !endsAt) {
      setSecondsLeft(0);

      return undefined;
    }

    const tick = () => {
      setSecondsLeft(getCountdownSeconds(endsAt));
    };

    tick();
    const interval = window.setInterval(tick, 250);

    return () => window.clearInterval(interval);
  }, [session.stage, endsAt]);

  const showEndTurn =
    session.stage === "turn" &&
    Boolean(activeTurn) &&
    payload.showTurnFooter;

  const headerRight = (
    <GameScreenHeaderActions
      {...(showEndTurn
        ? {
            endTurn: {
              onClick: async () => {
                setBusy(true);
                const ack = await emitWithAck("hat:endTurn");

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

  if (session.stage === "ready") {
    const context = getHatGameContext(session);

    if (role !== "describer") {
      footer = (
        <PrimaryFooterButton
          disabled
          label={`Waiting on ${context.activeDescriberName}, from ${context.activeTeam?.name ?? "Team"}`}
          onClick={() => {}}
        />
      );
    } else {
      footer = (
        <PrimaryFooterButton
          disabled={busy}
          label={busy ? "Loading…" : "Start turn"}
          onClick={async () => {
            setBusy(true);
            const ack = await emitWithAck("hat:startTurn");

            if (ack?.ok === false) {
              setError(ack.error ?? "");
            }

            setBusy(false);
          }}
        />
      );
    }
  } else if (
    session.stage === "turn" &&
    activeTurn &&
    payload.showTurnFooter
  ) {
    footer = (
      <div className="flex w-full flex-col gap-2">
        <SecondaryFooterButton
          disabled={busy || (activeTurn.skipsRemaining ?? 0) <= 0}
          icon={<IconSkipForward className="size-5" />}
          label="Skip"
          onClick={async () => {
            setBusy(true);
            const ack = await emitWithAck("hat:skipClue");

            if (ack?.ok === false) {
              setError(ack.error ?? "");
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
            const ack = await emitWithAck("hat:markCorrect");

            if (ack?.ok === false) {
              setError(ack.error ?? "");
            }

            setBusy(false);
          }}
        />
      </div>
    );
  } else if (session.stage === "finalSummary") {
    footer = (
      <PrimaryFooterButton
        disabled={busy}
        label="Final scores"
        onClick={async () => {
          setBusy(true);
          const ack = await emitWithAck("hat:viewResults");

          if (ack?.ok === false) {
            setError(ack.error ?? "");
          }

          setBusy(false);
        }}
      />
    );
  } else if (session.stage === "results") {
    footer = (
      <GameResultActions
        onNewGame={() => navigate("/")}
        onPickAnotherGame={() => navigate("/")}
        onReplay={() => navigate("/")}
      />
    );
  }

  let body: ReactNode = null;

  if (session.stage === "ready") {
    body = (
      <HatReadyMultiplayerBody error={error} payload={payload} session={session} />
    );
  } else if (session.stage === "turn" && activeTurn) {
    body = (
      <HatTurnMultiplayerBody
        busy={busy}
        emitWithAck={emitWithAck}
        payload={payload}
        secondsLeft={secondsLeft}
        session={session}
        setBusy={setBusy}
        setError={setError}
      />
    );
  } else if (session.stage === "finalSummary") {
    body = (
      <BetweenTurnsLayout
        banner={<ThatsTheLastTurnCard />}
        lastTurnCard={
          session.lastTurnSummary ? (
            <HatLastTurnCard summary={session.lastTurnSummary} />
          ) : null
        }
        nextSteps={
          <ReadyNextStepsCard primaryText={FINAL_TURN_RECAP_NEXT_STEPS} />
        }
      />
    );
  } else if (session.stage === "results") {
    const vm = session.results
      ? mapFinalResultsFromHat(session.results)
      : null;

    body = (
      <section className="relative flex flex-1 flex-col pb-4">
        <ResultsConfetti />
        <div className="relative z-10">
          <GamePanel title="Final Results">
            {vm ? (
              <FinalResultsBody vm={vm} />
            ) : (
              <p className="text-typ-body text-muted-foreground">No results yet.</p>
            )}
          </GamePanel>
        </div>
      </section>
    );
  }

  return (
    <FooterActionLockContext.Provider value={false}>
      <GameShell footer={footer} headerRight={headerRight} title="Hat Game">
        {body}
      </GameShell>
    </FooterActionLockContext.Provider>
  );
}

function HatReadyMultiplayerBody({
  session,
  payload,
  error,
}: {
  readonly session: HatGameSession;
  readonly payload: HatSyncDto;
  readonly error: string;
}) {
  const context = getHatGameContext(session);
  const phase = getHatGamePhaseMeta(session.phaseNumber);
  const previousTurn = session.lastTurnSummary;

  const primaryText = phase.instruction;

  const givePhoneLine =
    payload.readyReveal ? (
      <>
        <span className="font-semibold text-foreground">
          {context.activeDescriberName}
        </span>{" "}
        will describe on their device — start the turn from the footer when everyone is
        ready.
      </>
    ) : (
      <>
        Give the phone to{" "}
        <span className="font-semibold text-foreground">
          {context.activeDescriberName}
        </span>
        .
      </>
    );

  return (
    <BetweenTurnsLayout
      heading={
        <GamePanel title={`${context.activeTeam?.name ?? "Next team"} up next`} />
      }
      lastTurnCard={
        previousTurn ? <HatLastTurnCard summary={previousTurn} /> : null
      }
      nextSteps={
        <ReadyNextStepsCard
          givePhoneLine={givePhoneLine}
          primaryText={primaryText}
        />
      }
      progressCard={
        <ReadyProgressCard label="Phase">
          {session.phaseNumber}: {phase.name}
        </ReadyProgressCard>
      }
      scoreboard={<HatScoreboard session={session} />}
      tail={
        error ? (
          <p className="rounded-md border border-semantic-destructive-border-soft bg-semantic-destructive-surface-soft p-3 text-typ-ui text-destructive">
            {error}
          </p>
        ) : null
      }
    />
  );
}

function HatTurnMultiplayerBody({
  session,
  payload,
  secondsLeft,
  emitWithAck,
  setError,
  busy,
  setBusy,
}: {
  readonly session: HatGameSession;
  readonly payload: HatSyncDto;
  readonly secondsLeft: number;
  readonly emitWithAck: (
    event: string,
    body?: unknown,
  ) => Promise<{ ok?: boolean; error?: string } | undefined>;
  readonly setError: (message: string) => void;
  readonly busy: boolean;
  readonly setBusy: (next: boolean) => void;
}) {
  const context = getHatGameContext(session);
  const phase = getHatGamePhaseMeta(session.phaseNumber);
  const activeTurn = session.activeTurn!;

  const currentClue =
    activeTurn.clueQueue[activeTurn.queueIndex]?.text ?? "Loading";

  if (payload.role === "describer") {
    return (
      <GamePanel
        subtitle={`${context.activeDescriberName} is presenting`}
        title={`${context.activeTeam?.name ?? "Team"} guessing`}
      >
        <TurnPlayHighlight>{currentClue}</TurnPlayHighlight>
        <div className="grid grid-cols-2 gap-3">
          <Metric
            label="Time left"
            value={formatCountdown(secondsLeft)}
          />
          <Metric label="Phase" value={phase.name} />
          <Metric label="Score" value={String(activeTurn.score)} />
          <Metric
            label="Skipped waiting"
            value={String(activeTurn.skippedClues.length)}
          />
        </div>
        <p className={HAT_NOTICE_CLASS}>
          Phase {session.phaseNumber}: {phase.name}. {phase.instruction}
        </p>
        {activeTurn.skippedClues.length ? (
          <div className="rounded-lg border border-dashed border-border p-3">
            <p className="mb-2 text-typ-ui font-semibold">Skipped famous figures</p>
            <p className="mb-3 text-typ-ui text-muted-foreground">
              Pick a waiting word to return to it now.
            </p>
            <div className="grid gap-2">
              {activeTurn.skippedClues.map((clue) => (
                <FooterOutlineIconTextButton
                  key={clue.poolIndex}
                  icon={<span aria-hidden="true">↶</span>}
                  label={clue.text}
                  onClick={async () => {
                    if (!payload.canReturnSkipped || busy) {
                      return;
                    }

                    setBusy(true);
                    const ack = await emitWithAck("hat:returnSkipped", {
                      poolIndex: clue.poolIndex,
                    });

                    if (ack?.ok === false) {
                      setError(ack.error ?? "");
                    }

                    setBusy(false);
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </GamePanel>
    );
  }

  if (payload.role === "guesser") {
    return (
      <section className="flex flex-1 flex-col gap-4 pb-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-typ-panel-title font-semibold">Guess with your team</p>
          <p className="mt-2 text-typ-ui-snug text-muted-foreground">
            You do not see the secret name. Listen to your describer and shout guesses
            together.
          </p>
          <p className="mt-4 font-mono text-typ-display text-foreground">••••••</p>
          <p className="mt-2 text-typ-ui text-muted-foreground">
            Phase:{" "}
            <span className="font-semibold text-foreground">{phase.name}</span>
          </p>
          <div className="mt-4">
            <Metric
              label="Time left"
              value={formatCountdown(secondsLeft)}
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-4 pb-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-typ-panel-title font-semibold">Sit tight</p>
        <p className="mt-2 text-typ-ui-snug text-muted-foreground">
          Another team is describing right now. Wait for your bench to rotate in.
        </p>
      </div>
    </section>
  );
}
