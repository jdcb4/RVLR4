import type { MultiplayerReplayUi } from "@/components/GameResultActions";

/** Builds replay footer state from shared room sync (`RoomSyncPayload.replay`). */
export function buildMultiplayerReplayUi(args: {
  readonly offerActive: boolean;
  readonly acceptedIds: readonly string[];
  readonly cancelledByDisconnect: boolean;
  readonly viewerId: string;
  readonly isHost: boolean;
  readonly emitWithAck: (
    event: string,
    body?: unknown,
  ) => Promise<{ ok?: boolean; error?: string } | undefined>;
}): MultiplayerReplayUi {
  const { offerActive, acceptedIds, cancelledByDisconnect, viewerId, isHost, emitWithAck } = args;

  if (cancelledByDisconnect) {
    return {
      mode: "inactive",
      label: "Replay disabled — a player left the room.",
    };
  }

  if (!offerActive && isHost) {
    return {
      mode: "hostOffer",
      onClick: () => {
        void emitWithAck("game:hostOfferReplay");
      },
    };
  }

  if (!offerActive && !isHost) {
    return { mode: "waitingHost", disabled: true };
  }

  if (offerActive && !acceptedIds.includes(viewerId)) {
    return {
      mode: "joinReplay",
      onClick: () => {
        void emitWithAck("game:acceptReplay");
      },
    };
  }

  return {
    mode: "inactive",
    label: "Waiting for everyone to join replay…",
  };
}
