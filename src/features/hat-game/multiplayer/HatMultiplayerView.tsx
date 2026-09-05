import { type ReactNode, useEffect, useRef, useState } from "react";

import { GameScreenHeaderActions } from "@/components/game/GameScreenHeaderActions";
import { getCountdownSeconds } from "@/domain/hat-game/time";
import type { ReplaySync } from "@/domain/multiplayer/protocol";
import type { HatSyncDto } from "@/domain/multiplayer/protocol";
import type { EmitWithAck } from "@/domain/multiplayer/protocol";
import { MultiplayerGameShell } from "@/features/multiplayer/MultiplayerGameShell";
import { playGameSoundEffect } from "@/services/gameSoundEffects";
import { playSoundCue } from "@/services/hatSound";

import { HatMultiplayerBody } from "./HatMultiplayerBody";
import { HatMultiplayerFooter } from "./HatMultiplayerFooter";

export function HatMultiplayerView({
  payload,
  emitWithAck,
  viewerPlayerId,
  isHost,
  replaySync,
  roomControls,
}: {
  readonly payload: HatSyncDto;
  readonly viewerPlayerId: string;
  readonly isHost: boolean;
  readonly replaySync: ReplaySync;
  readonly roomControls?: ReactNode;
  readonly emitWithAck: EmitWithAck;
}) {
  const session = payload.session;
  const activeTurn = session.activeTurn;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showScoresPane, setShowScoresPane] = useState(false);
  const secondsLeft = useHatMultiplayerCues(payload);
  const showEndTurn = session.stage === "turn" && Boolean(activeTurn) && payload.showTurnFooter;

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

  return (
    <MultiplayerGameShell
      footer={
        <HatMultiplayerFooter
          busy={busy}
          emitWithAck={emitWithAck}
          isHost={isHost}
          payload={payload}
          replaySync={replaySync}
          session={session}
          setBusy={setBusy}
          setError={setError}
          showScoresPane={showScoresPane}
          viewerPlayerId={viewerPlayerId}
          onShowScoresPane={() => setShowScoresPane(true)}
        />
      }
      headerRight={
        <>
          {headerRight}
          {roomControls}
        </>
      }
      title="Hat Game"
    >
      <HatMultiplayerBody
        busy={busy}
        emitWithAck={emitWithAck}
        error={error}
        payload={payload}
        secondsLeft={secondsLeft}
        session={session}
        setBusy={setBusy}
        setError={setError}
        showScoresPane={showScoresPane}
        viewerPlayerId={viewerPlayerId}
      />
    </MultiplayerGameShell>
  );
}

function useHatMultiplayerCues(payload: HatSyncDto) {
  const session = payload.session;
  const activeTurn = session.activeTurn;
  const endsAt = activeTurn?.endsAt;
  const [countdown, setCountdown] = useState(() => ({
    endsAt,
    secondsLeft: getCountdownSeconds(endsAt),
  }));
  // A newly received turn must not render the previous turn's zero before effects run.
  const secondsLeft =
    countdown.endsAt === endsAt ? countdown.secondsLeft : getCountdownSeconds(endsAt);
  const warned10Ref = useRef<string | null>(null);
  const timedOutRef = useRef<string | null>(null);
  const prevPhaseRef = useRef<number | null>(null);

  useEffect(() => {
    if (session.stage !== "turn" || !endsAt) {
      return undefined;
    }

    const tick = () => {
      setCountdown({ endsAt, secondsLeft: getCountdownSeconds(endsAt) });
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
        void playGameSoundEffect("warn10");
      }
    }, 400);

    return () => window.clearInterval(interval);
  }, [session.stage, endsAt, activeTurn]);

  useEffect(() => {
    if (timedOutRef.current && session.stage !== "turn") {
      void playGameSoundEffect("timeout");
      timedOutRef.current = null;
    } else if (!timedOutRef.current && session.stage === "turn") {
      timedOutRef.current = activeTurn?.startedAt ?? "turn";
    }
  }, [session.stage, activeTurn]);

  useEffect(() => {
    const prev = prevPhaseRef.current;
    const next = session.phaseNumber;
    prevPhaseRef.current = next;

    if (prev === null || prev === next) {
      return;
    }

    if (next === 2) {
      playSoundCue("phase-one-word");
    } else if (next === 3) {
      playSoundCue("phase-charades");
    }
  }, [session.phaseNumber]);

  return secondsLeft;
}
