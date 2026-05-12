import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { BetweenTurnsLayout } from "@/components/game/BetweenTurnsLayout";
import { FinalResultsBody } from "@/components/game/final-results/FinalResultsBody";
import { ResultsConfetti } from "@/components/game/final-results/ResultsConfetti";
import {
  mapFinalResultsFromHat,
  viewerHatTeamIsWinner,
} from "@/components/game/final-results/viewModel";
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
import { IconCheck, IconSkipForward } from "@/components/icons";
import { Metric } from "@/components/Metric";
import {
  getHatGameContext,
  getHatGamePhaseMeta,
} from "@/domain/hat-game/engine";
import { formatCountdown, getCountdownSeconds } from "@/domain/hat-game/time";
import type { HatGameSession } from "@/domain/hat-game/types";
import { HatScoreboard } from "@/features/hat-game/screens/HatScoreboard";
import {
  MultiplayerEndGameActions,
  MultiplayerGameShell,
} from "@/features/multiplayer/MultiplayerGameShell";
import { cn } from "@/lib/utils";
import type { HatSyncDto } from "@/multiplayer/roomTypes";
import { multiplayerUpNextHeadingTitle } from "@/multiplayer/upNextHeading";
import { playSoundCue } from "@/services/hatGameSound";
import { playMultiplayerToneCue } from "@/services/multiplayerTone";

/** Border + background tint for each Hat phase (Describe / One Word / Charades). */
function hatPhaseSpectatorStyles(phaseNumber: number): string {
  switch (phaseNumber) {
    case 1:
      return "border-sky-500 bg-sky-500/15 text-sky-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] dark:border-sky-400 dark:bg-sky-500/25 dark:text-sky-50";
    case 2:
      return "border-amber-500 bg-amber-500/15 text-amber-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] dark:border-amber-400 dark:bg-amber-500/25 dark:text-amber-50";
    case 3:
      return "border-violet-500 bg-violet-500/15 text-violet-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] dark:border-violet-400 dark:bg-violet-500/25 dark:text-violet-50";
    default:
      return "border-border bg-muted/40 text-foreground";
  }
}

/**
 * Large phase readout for guessers / observers. Flashes when `phaseNumber` changes mid-turn
 * (synced from the host device).
 */
function HatSpectatorPhaseBanner({
  phaseNumber,
  phaseName,
  instruction,
}: {
  readonly phaseNumber: number;
  readonly phaseName: string;
  readonly instruction: string;
}) {
  const prevPhaseRef = useRef<number | undefined>(undefined);
  const [runFlash, setRunFlash] = useState(false);

  useLayoutEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phaseNumber;

    if (prev !== undefined && prev !== phaseNumber) {
      setRunFlash(true);
    }
  }, [phaseNumber]);

  useEffect(() => {
    if (!runFlash) {
      return undefined;
    }

    /** Matches `animate-hat-phase-flash` duration (5 × 0.22s); clears state if animation did not run. */
    const id = window.setTimeout(() => {
      setRunFlash(false);
    }, 1250);

    return () => window.clearTimeout(id);
  }, [runFlash]);

  return (
    <div
      aria-live="polite"
      className={cn(
        "rounded-2xl border-2 px-4 py-3 transition-colors",
        hatPhaseSpectatorStyles(phaseNumber),
        runFlash && "motion-safe:animate-hat-phase-flash",
      )}
    >
      <p className="text-typ-overline opacity-90">Game phase</p>
      <p className="mt-1 text-typ-panel-title font-bold tracking-tight">
        Phase {phaseNumber}: {phaseName}
      </p>
      <p className="mt-2 text-typ-ui-snug opacity-95">{instruction}</p>
    </div>
  );
}

export function HatMultiplayerView({
  payload,
  emitWithAck,
  viewerPlayerId,
  isHost,
  replaySync,
}: {
  readonly payload: HatSyncDto;
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
  const session = payload.session;
  const role = payload.role;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showScoresPane, setShowScoresPane] = useState(false);
  const warned10Ref = useRef<string | null>(null);
  const timedOutRef = useRef<string | null>(null);

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

  /** 10-second warning while a turn is running (everyone, spectators included). */
  useEffect(() => {
    if (session.stage !== "turn" || !endsAt || !activeTurn) {
      warned10Ref.current = null;

      return undefined;
    }

    const interval = window.setInterval(() => {
      const left = getCountdownSeconds(endsAt);

      if (left <= 10 && left > 0 && warned10Ref.current !== activeTurn.startedAt) {
        warned10Ref.current = activeTurn.startedAt;
        void playMultiplayerToneCue("warn10");
      }
    }, 400);

    return () => window.clearInterval(interval);
  }, [session.stage, endsAt, activeTurn]);

  /**
   * End-of-turn cue for everyone — fires whenever the session leaves stage
   * `turn`, regardless of cause (manual End turn tap, timer expiry, ran out
   * of words). Replaces the earlier timer-expiry-only trigger so a describer
   * who taps End turn before the clock hits zero still gets the audible beat.
   */
  useEffect(() => {
    if (timedOutRef.current && session.stage !== "turn") {
      void playMultiplayerToneCue("timeout");
      timedOutRef.current = null;
    } else if (!timedOutRef.current && session.stage === "turn") {
      timedOutRef.current = activeTurn?.startedAt ?? "turn";
    }
  }, [session.stage, activeTurn]);

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
      const viewerTeamId = session.players.find((player) => player.id === viewerPlayerId)?.teamId;
      const readyFooterLabel = multiplayerUpNextHeadingTitle({
        viewerPlayerId,
        viewerTeamId,
        nextTeamId: context.activeTeamId,
        nextDescriberPlayerId: context.activeDescriberId,
        nextTeamDisplayName: context.activeTeam?.name ?? "Team",
      });

      footer = (
        <PrimaryFooterButton disabled label={readyFooterLabel} onClick={() => {}} />
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
            const ack = await emitWithAck("hat:markCorrect");

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
  } else if (session.stage === "finalSummary") {
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
  } else if (session.stage === "results") {
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

  if (session.stage === "ready") {
    body = (
      <HatReadyMultiplayerBody
        error={error}
        payload={payload}
        session={session}
        viewerPlayerId={viewerPlayerId}
      />
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
    body = showScoresPane ? (
      <HatFinalResultsSection session={session} viewerPlayerId={viewerPlayerId} />
    ) : (
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
    body = (
      <HatFinalResultsSection session={session} viewerPlayerId={viewerPlayerId} />
    );
  }

  return (
    <MultiplayerGameShell footer={footer} headerRight={headerRight} title="Hat Game">
      {body}
    </MultiplayerGameShell>
  );
}

function HatFinalResultsSection({
  session,
  viewerPlayerId,
}: {
  readonly session: HatGameSession;
  readonly viewerPlayerId: string;
}) {
  const vm = session.results ? mapFinalResultsFromHat(session.results) : null;
  const showConfetti = viewerHatTeamIsWinner(session, viewerPlayerId);
  const outcomePlayedRef = useRef(false);

  useEffect(() => {
    if (!vm || outcomePlayedRef.current) {
      return;
    }

    outcomePlayedRef.current = true;
    void playMultiplayerToneCue(showConfetti ? "victory" : "defeat");
  }, [vm, showConfetti]);

  return (
    <section className="relative flex flex-1 flex-col pb-4">
      {showConfetti ? <ResultsConfetti /> : null}
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

function HatReadyMultiplayerBody({
  session,
  payload,
  error,
  viewerPlayerId,
}: {
  readonly session: HatGameSession;
  readonly payload: HatSyncDto;
  readonly error: string;
  readonly viewerPlayerId: string;
}) {
  const context = getHatGameContext(session);
  const phase = getHatGamePhaseMeta(session.phaseNumber);
  const previousTurn = session.lastTurnSummary;
  const role = payload.role;

  const viewerTeamId = session.players.find((player) => player.id === viewerPlayerId)?.teamId;
  const nextTeamId = context.activeTeamId;
  const viewerOnNextTeam = Boolean(
    viewerTeamId && nextTeamId && viewerTeamId === nextTeamId,
  );
  const nextTeamName = context.activeTeam?.name ?? "Team";

  const upNextPanel = (
    <GamePanel
      title={multiplayerUpNextHeadingTitle({
        viewerPlayerId,
        viewerTeamId,
        nextTeamId: context.activeTeamId,
        nextDescriberPlayerId: context.activeDescriberId,
        nextTeamDisplayName: nextTeamName,
      })}
    />
  );

  let nextStepsPrimary: ReactNode;

  if (role === "describer") {
    nextStepsPrimary = (
      <>
        It&apos;s your turn. When you&apos;re ready, tap <strong>Start turn</strong> in the
        footer.
      </>
    );
  } else if (viewerOnNextTeam) {
    nextStepsPrimary = (
      <>
        Your team is up now. Get ready to guess when{" "}
        <span className="font-semibold text-foreground">{context.activeDescriberName}</span>{" "}
        starts the turn.
      </>
    );
  } else {
    nextStepsPrimary = (
      <>
        <span className="font-semibold text-foreground">{nextTeamName}</span> is up next.
        Waiting for{" "}
        <span className="font-semibold text-foreground">{context.activeDescriberName}</span> to
        start the turn.
      </>
    );
  }

  return (
    <BetweenTurnsLayout
      heading={upNextPanel}
      lastTurnCard={
        previousTurn ? <HatLastTurnCard summary={previousTurn} /> : null
      }
      nextSteps={<ReadyNextStepsCard primaryText={nextStepsPrimary} />}
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
      <section className="flex flex-1 flex-col gap-4 pb-4">
        <HatSpectatorPhaseBanner
          instruction={phase.instruction}
          phaseName={phase.name}
          phaseNumber={session.phaseNumber}
        />

        <GamePanel
          subtitle={`${context.activeDescriberName} is presenting`}
          title={`${context.activeTeam?.name ?? "Team"} guessing`}
        >
          <TurnPlayHighlight>{currentClue}</TurnPlayHighlight>
          <div className="grid grid-cols-2 gap-3">
            <Metric
              className="col-span-2"
              label="Time left"
              value={formatCountdown(secondsLeft)}
            />
            <Metric label="Score" value={String(activeTurn.score)} />
            <Metric
              label="Skipped waiting"
              value={String(activeTurn.skippedClues.length)}
            />
          </div>
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
                    } else {
                      playSoundCue("return-skipped");
                    }

                    setBusy(false);
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}
        </GamePanel>
      </section>
    );
  }

  if (payload.role === "guesser") {
    return (
      <section className="flex flex-1 flex-col gap-4 pb-4">
        <HatSpectatorPhaseBanner
          instruction={phase.instruction}
          phaseName={phase.name}
          phaseNumber={session.phaseNumber}
        />

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-typ-panel-title font-semibold">Guess with your team</p>
          <p className="mt-2 text-typ-ui-snug text-muted-foreground">
            You do not see the secret name. Listen to your describer and shout guesses
            together.
          </p>
          <p className="mt-4 font-mono text-typ-display text-foreground">••••••</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-typ-overline text-muted-foreground">Turn snapshot</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Metric label="Time left" value={formatCountdown(secondsLeft)} />
            <Metric label="Turn score" value={String(activeTurn.score)} />
            <Metric
              className="col-span-2"
              label="Describer"
              value={context.activeDescriberName}
            />
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-typ-ui font-semibold text-foreground">Standings</p>
            <ul className="mt-2 space-y-1 text-typ-ui text-muted-foreground">
              {session.teams.map((team) => (
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

  return (
    <section className="flex flex-1 flex-col gap-4 pb-4">
      <HatSpectatorPhaseBanner
        instruction={phase.instruction}
        phaseName={phase.name}
        phaseNumber={session.phaseNumber}
      />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-typ-panel-title font-semibold">Sit tight</p>
        <p className="mt-2 text-typ-ui-snug text-muted-foreground">
          Another team is describing right now. Wait for your bench to rotate in.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-typ-overline text-muted-foreground">Turn snapshot</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Metric label="Time left" value={formatCountdown(secondsLeft)} />
          <Metric label="Turn score" value={String(activeTurn.score)} />
          <Metric
            className="col-span-2"
            label="Describer"
            value={context.activeDescriberName}
          />
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-typ-ui font-semibold text-foreground">Standings</p>
          <ul className="mt-2 space-y-1 text-typ-ui text-muted-foreground">
            {session.teams.map((team) => (
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
