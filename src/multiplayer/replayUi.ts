import type { MultiplayerReplayUi } from "@/components/GameResultActions";
import type { RoomSyncPayload } from "@/multiplayer/roomTypes";

/** Builds replay footer state from shared room sync (`RoomSyncPayload.replay`). */
export function buildMultiplayerReplayUi(
  args: RoomSyncPayload["replay"] & {
    readonly viewerId: string;
    readonly isHost: boolean;
    readonly emitWithAck: (
      event: string,
      body?: unknown,
    ) => Promise<{ ok?: boolean; error?: string } | undefined>;
  },
): MultiplayerReplayUi {
  const {
    offerActive,
    offerId,
    acceptedIds,
    cancelledByDisconnect,
    viewerId,
    isHost,
    emitWithAck,
  } = args;

  if (cancelledByDisconnect) {
    return {
      mode: "inactive",
      label: "Replay paused — waiting for everyone to reconnect.",
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
        void emitWithAck("game:acceptReplay", offerId ? { offerId } : undefined);
      },
    };
  }

  return {
    mode: "inactive",
    label: "Waiting for everyone to join replay…",
  };
}
