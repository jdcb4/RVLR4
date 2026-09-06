import { type ReactNode, useEffect, useRef, useState } from "react";

import type { ReplaySync } from "@/domain/multiplayer/protocol";
import type { ImposterSyncDto } from "@/domain/multiplayer/protocol";
import type { EmitWithAck } from "@/domain/multiplayer/protocol";
import { MultiplayerGameShell } from "@/features/multiplayer/MultiplayerGameShell";
import { playGameSoundEffect } from "@/services/gameSoundEffects";

import { ImposterMultiplayerBody } from "./ImposterMultiplayerBody";
import {
  type ImposterMultiplayerDispatch,
  ImposterMultiplayerFooter,
} from "./ImposterMultiplayerFooter";

export function ImposterMultiplayerView({
  payload,
  viewerPlayerId,
  isHost,
  replaySync,
  roomControls,
  emitWithAck,
}: {
  readonly payload: ImposterSyncDto;
  readonly viewerPlayerId: string;
  readonly isHost: boolean;
  readonly replaySync: ReplaySync;
  readonly roomControls?: ReactNode;
  readonly emitWithAck: EmitWithAck;
}) {
  const step = payload.snapshot.step;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const prevStepRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (prevStepRef.current !== undefined && prevStepRef.current !== step) {
      void playGameSoundEffect("phaseAdvance");
    }

    prevStepRef.current = step;
  }, [step]);

  const dispatch: ImposterMultiplayerDispatch = async (action) => {
    setBusy(true);
    const ack = await emitWithAck("imposter:dispatch", action);

    if (ack?.ok === false) {
      setError(ack.error ?? "");
    }

    setBusy(false);
  };

  const footer = (
    <ImposterMultiplayerFooter
      busy={busy}
      emitWithAck={emitWithAck}
      isHost={isHost}
      payload={payload}
      replaySync={replaySync}
      viewerPlayerId={viewerPlayerId}
      onDispatch={dispatch}
    />
  );

  return (
    <MultiplayerGameShell footer={footer} title="Imposter" headerRight={roomControls}>
      <ImposterMultiplayerBody
        error={error}
        isHost={isHost}
        payload={payload}
        viewerPlayerId={viewerPlayerId}
      />
    </MultiplayerGameShell>
  );
}
