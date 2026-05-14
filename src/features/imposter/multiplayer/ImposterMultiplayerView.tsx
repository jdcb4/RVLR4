import { useEffect, useRef, useState } from "react";

import { MultiplayerGameShell } from "@/features/multiplayer/MultiplayerGameShell";
import type { ImposterSyncDto } from "@/multiplayer/roomTypes";
import { playMultiplayerToneCue } from "@/services/multiplayerTone";

import { ImposterMultiplayerBody } from "./ImposterMultiplayerBody";
import {
  type ImposterMultiplayerDispatch,
  ImposterMultiplayerFooter,
} from "./ImposterMultiplayerFooter";

type EmitWithAck = (
  event: string,
  body?: unknown,
) => Promise<{ ok?: boolean; error?: string } | undefined>;

export function ImposterMultiplayerView({
  payload,
  viewerPlayerId,
  isHost,
  replaySync,
  emitWithAck,
}: {
  readonly payload: ImposterSyncDto;
  readonly viewerPlayerId: string;
  readonly isHost: boolean;
  readonly replaySync: {
    readonly offerActive: boolean;
    readonly acceptedIds: readonly string[];
    readonly cancelledByDisconnect: boolean;
  };
  readonly emitWithAck: EmitWithAck;
}) {
  const step = payload.snapshot.step;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const prevStepRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (prevStepRef.current !== undefined && prevStepRef.current !== step) {
      void playMultiplayerToneCue("phaseAdvance");
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
    <MultiplayerGameShell footer={footer} title="Imposter">
      <ImposterMultiplayerBody
        error={error}
        isHost={isHost}
        payload={payload}
        viewerPlayerId={viewerPlayerId}
      />
    </MultiplayerGameShell>
  );
}
