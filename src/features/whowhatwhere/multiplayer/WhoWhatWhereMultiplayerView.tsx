import { type ReactNode, useEffect, useRef, useState } from "react";

import { GameScreenHeaderActions } from "@/components/game/GameScreenHeaderActions";
import type { ReplaySync } from "@/domain/multiplayer/protocol";
import type { WhoWhatWhereSyncDto } from "@/domain/multiplayer/protocol";
import type { EmitWithAck } from "@/domain/multiplayer/protocol";
import { getSecondsLeft } from "@/domain/whowhatwhere/game";
import { MultiplayerGameShell } from "@/features/multiplayer/MultiplayerGameShell";
import { playGameSoundEffect } from "@/services/gameSoundEffects";

import { WhoWhatWhereMultiplayerBody } from "./WhoWhatWhereMultiplayerBody";
import { WhoWhatWhereMultiplayerFooter } from "./WhoWhatWhereMultiplayerFooter";

export function WhoWhatWhereMultiplayerView({
  payload,
  emitWithAck,
  viewerPlayerId,
  isHost,
  replaySync,
  roomControls,
}: {
  readonly payload: WhoWhatWhereSyncDto;
  readonly viewerPlayerId: string;
  readonly isHost: boolean;
  readonly replaySync: ReplaySync;
  readonly roomControls?: ReactNode;
  readonly emitWithAck: EmitWithAck;
}) {
  const match = payload.match;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showScoresPane, setShowScoresPane] = useState(false);
  const showEndTurn = match.stage === "turn" && Boolean(match.activeTurn) && payload.showTurnFooter;

  useWhoWhatWhereMultiplayerCues(payload);

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

  return (
    <MultiplayerGameShell
      footer={
        <WhoWhatWhereMultiplayerFooter
          busy={busy}
          emitWithAck={emitWithAck}
          isHost={isHost}
          match={match}
          replaySync={replaySync}
          role={payload.role}
          setBusy={setBusy}
          setError={setError}
          showScoresPane={showScoresPane}
          showTurnFooter={payload.showTurnFooter}
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
      title="Who What Where"
    >
      <WhoWhatWhereMultiplayerBody
        emitWithAck={emitWithAck}
        error={error}
        payload={payload}
        setError={setError}
        showScoresPane={showScoresPane}
        viewerPlayerId={viewerPlayerId}
      />
    </MultiplayerGameShell>
  );
}

function useWhoWhatWhereMultiplayerCues(payload: WhoWhatWhereSyncDto) {
  const match = payload.match;
  const warned10Ref = useRef<string | null>(null);
  const timedOutRef = useRef<string | null>(null);

  /** 10-second warning while a turn is running (everyone, spectators included). */
  useEffect(() => {
    if (match.stage !== "turn" || !match.activeTurn) {
      warned10Ref.current = null;

      return undefined;
    }

    const turn = match.activeTurn;
    const interval = window.setInterval(() => {
      const left = getSecondsLeft(turn);

      if (left <= 10 && left > 0 && warned10Ref.current !== turn.startedAt) {
        warned10Ref.current = turn.startedAt;
        void playGameSoundEffect("warn10");
      }
    }, 400);

    return () => window.clearInterval(interval);
  }, [match.stage, match.activeTurn]);

  useEffect(() => {
    if (timedOutRef.current && match.stage !== "turn") {
      void playGameSoundEffect("timeout");
      timedOutRef.current = null;
    } else if (!timedOutRef.current && match.stage === "turn") {
      timedOutRef.current = match.activeTurn?.startedAt ?? "turn";
    }
  }, [match.stage, match.activeTurn]);
}
