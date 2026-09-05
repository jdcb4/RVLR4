import { useEffect, useRef } from "react";

import { AccessibleCountdownValue } from "@/components/game/AccessibleCountdownValue";
import { BetweenTurnsLayout } from "@/components/game/BetweenTurnsLayout";
import { FinalResultsBody } from "@/components/game/final-results/FinalResultsBody";
import { ResultsConfetti } from "@/components/game/final-results/ResultsConfetti";
import {
  mapFinalResultsFromHat,
  viewerHatTeamIsWinner,
} from "@/components/game/final-results/viewModel";
import { FINAL_TURN_RECAP_NEXT_STEPS } from "@/components/game/finalTurnRecapCopy";
import { GamePanel } from "@/components/game/GamePanel";
import { HatLastTurnCard } from "@/components/game/HatLastTurnCard";
import { ReadyNextStepsCard } from "@/components/game/ReadyNextStepsCard";
import { ReadyProgressCard } from "@/components/game/ReadyProgressCard";
import { TeamStandingsList } from "@/components/game/TeamStandingsList";
import { ThatsTheLastTurnCard } from "@/components/game/ThatsTheLastTurnCard";
import { Metric } from "@/components/Metric";
import { PlayerAvatarBadge } from "@/components/PlayerAvatar";
import { getHatGameContext, getHatGamePhaseMeta } from "@/domain/hat-game/engine";
import { formatCountdown } from "@/domain/hat-game/time";
import type { HatGameSession } from "@/domain/hat-game/types";
import type { HatSyncDto } from "@/domain/multiplayer/protocol";
import type { EmitWithAck } from "@/domain/multiplayer/protocol";
import { HatActiveTurnPanel } from "@/features/hat-game/HatActiveTurnPanel";
import { HatPhaseBanner } from "@/features/hat-game/HatPhaseBanner";
import { HatScoreboard } from "@/features/hat-game/screens/HatScoreboard";
import { multiplayerUpNextHeadingTitle } from "@/multiplayer/upNextHeading";
import { playGameSoundEffect } from "@/services/gameSoundEffects";

export function HatMultiplayerBody({
  payload,
  session,
  viewerPlayerId,
  error,
  secondsLeft,
  busy,
  showScoresPane,
  emitWithAck,
  setBusy,
  setError,
}: {
  readonly payload: HatSyncDto;
  readonly session: HatGameSession;
  readonly viewerPlayerId: string;
  readonly error: string;
  readonly secondsLeft: number;
  readonly busy: boolean;
  readonly showScoresPane: boolean;
  readonly emitWithAck: EmitWithAck;
  readonly setBusy: (next: boolean) => void;
  readonly setError: (message: string) => void;
}) {
  const activeTurn = session.activeTurn;

  if (session.stage === "ready") {
    return (
      <HatReadyMultiplayerBody
        error={error}
        payload={payload}
        session={session}
        viewerPlayerId={viewerPlayerId}
      />
    );
  }

  if (session.stage === "turn" && activeTurn) {
    return (
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
  }

  if (session.stage === "finalSummary") {
    return showScoresPane ? (
      <HatFinalResultsSection session={session} viewerPlayerId={viewerPlayerId} />
    ) : (
      <BetweenTurnsLayout
        banner={<ThatsTheLastTurnCard />}
        lastTurnCard={
          session.lastTurnSummary ? <HatLastTurnCard summary={session.lastTurnSummary} /> : null
        }
        nextSteps={<ReadyNextStepsCard primaryText={FINAL_TURN_RECAP_NEXT_STEPS} />}
      />
    );
  }

  if (session.stage === "results") {
    return <HatFinalResultsSection session={session} viewerPlayerId={viewerPlayerId} />;
  }

  return null;
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
    void playGameSoundEffect(showConfetti ? "victory" : "defeat");
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
  const viewerOnNextTeam = Boolean(viewerTeamId && nextTeamId && viewerTeamId === nextTeamId);
  const nextTeamName = context.activeTeam?.name ?? "Team";
  const activeDescriber = session.players.find((player) => player.id === context.activeDescriberId);

  const upNextPanel = (
    <GamePanel
      title={multiplayerUpNextHeadingTitle({
        viewerPlayerId,
        viewerTeamId,
        nextTeamId: context.activeTeamId,
        nextDescriberPlayerId: context.activeDescriberId,
        nextTeamDisplayName: nextTeamName,
      })}
    >
      <PlayerAvatarBadge
        avatarId={activeDescriber?.avatarId}
        detail={`${nextTeamName} describer`}
        name={context.activeDescriberName}
      />
    </GamePanel>
  );

  return (
    <BetweenTurnsLayout
      heading={upNextPanel}
      lastTurnCard={previousTurn ? <HatLastTurnCard summary={previousTurn} /> : null}
      nextSteps={
        <ReadyNextSteps role={role} viewerOnNextTeam={viewerOnNextTeam} context={context} />
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

function ReadyNextSteps({
  role,
  viewerOnNextTeam,
  context,
}: {
  readonly role: HatSyncDto["role"];
  readonly viewerOnNextTeam: boolean;
  readonly context: ReturnType<typeof getHatGameContext>;
}) {
  const nextTeamName = context.activeTeam?.name ?? "Team";

  if (role === "describer") {
    return (
      <ReadyNextStepsCard
        primaryText={
          <>
            It&apos;s your turn. When you&apos;re ready, tap <strong>Start turn</strong> in the
            footer.
          </>
        }
      />
    );
  }

  if (viewerOnNextTeam) {
    return (
      <ReadyNextStepsCard
        primaryText={
          <>
            Your team is up now. Get ready to guess when{" "}
            <span className="font-semibold text-foreground">{context.activeDescriberName}</span>{" "}
            starts the turn.
          </>
        }
      />
    );
  }

  return (
    <ReadyNextStepsCard
      primaryText={
        <>
          <span className="font-semibold text-foreground">{nextTeamName}</span> is up next. Waiting
          for <span className="font-semibold text-foreground">{context.activeDescriberName}</span>{" "}
          to start the turn.
        </>
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
  readonly emitWithAck: EmitWithAck;
  readonly setError: (message: string) => void;
  readonly busy: boolean;
  readonly setBusy: (next: boolean) => void;
}) {
  const context = getHatGameContext(session);
  const phase = getHatGamePhaseMeta(session.phaseNumber);
  const activeTurn = session.activeTurn!;

  if (payload.role === "describer") {
    return (
      <HatActiveTurnPanel
        onReturnSkipped={async (poolIndex) => {
          if (!payload.canReturnSkipped || busy) {
            return;
          }

          setBusy(true);
          const ack = await emitWithAck("hat:returnSkipped", {
            poolIndex,
          });

          if (ack?.ok === false) {
            setError(ack.error ?? "");
          } else {
            void playGameSoundEffect("returnSkipped");
          }

          setBusy(false);
        }}
        secondsRemaining={secondsLeft}
        session={session}
      />
    );
  }

  return (
    <HatPassiveTurnBody
      activeTurn={activeTurn}
      context={context}
      phase={phase}
      phaseNumber={session.phaseNumber}
      role={payload.role}
      secondsLeft={secondsLeft}
      teams={session.teams}
    />
  );
}

function HatPassiveTurnBody({
  role,
  phase,
  phaseNumber,
  activeTurn,
  context,
  secondsLeft,
  teams,
}: {
  readonly role: HatSyncDto["role"];
  readonly phase: ReturnType<typeof getHatGamePhaseMeta>;
  readonly phaseNumber: number;
  readonly activeTurn: NonNullable<HatGameSession["activeTurn"]>;
  readonly context: ReturnType<typeof getHatGameContext>;
  readonly secondsLeft: number;
  readonly teams: HatGameSession["teams"];
}) {
  const isGuesser = role === "guesser";
  const activeDescriber = context.activeTeamPlayers.find(
    (player) => player.id === context.activeDescriberId,
  );

  return (
    <section className="flex flex-1 flex-col gap-4 pb-4">
      <HatPhaseBanner
        instruction={phase.instruction}
        phaseName={phase.name}
        phaseNumber={phaseNumber}
      />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-typ-panel-title font-semibold">
          {isGuesser ? "Guess with your team" : "Sit tight"}
        </p>
        <p className="mt-2 text-typ-ui-snug text-muted-foreground">
          {isGuesser
            ? "You do not see the secret name. Listen to your describer and shout guesses together."
            : "Another team is describing right now. Wait for your bench to rotate in."}
        </p>
        {isGuesser ? (
          <p className="mt-4 font-mono text-typ-display text-foreground">••••••</p>
        ) : null}
      </div>

      <HatSpectatorTurnSnapshotCard
        activeTurn={activeTurn}
        activeDescriberAvatarId={activeDescriber?.avatarId}
        context={context}
        secondsLeft={secondsLeft}
        teams={teams}
      />
    </section>
  );
}

/**
 * Shared "Turn snapshot" card for guesser + spectator Hat multi-device views.
 * Time, score, describer, and current standings.
 */
function HatSpectatorTurnSnapshotCard({
  activeTurn,
  activeDescriberAvatarId,
  context,
  secondsLeft,
  teams,
}: {
  readonly activeTurn: { readonly score: number; readonly startedAt: string };
  readonly activeDescriberAvatarId?: string | undefined;
  readonly context: { readonly activeDescriberName: string };
  readonly secondsLeft: number;
  readonly teams: readonly { readonly id: string; readonly name: string; readonly score: number }[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-typ-overline text-muted-foreground">Turn snapshot</p>
      <PlayerAvatarBadge
        avatarId={activeDescriberAvatarId}
        className="mt-3"
        detail="Describer"
        name={context.activeDescriberName}
      />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Metric
          label="Time left"
          value={
            <AccessibleCountdownValue
              countdownKey={activeTurn.startedAt}
              formattedValue={formatCountdown(secondsLeft)}
              secondsLeft={secondsLeft}
            />
          }
        />
        <Metric label="Turn score" value={String(activeTurn.score)} />
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-typ-ui font-semibold text-foreground">Standings</p>
        <TeamStandingsList teams={teams} />
      </div>
    </div>
  );
}
