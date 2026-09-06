import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { FooterActionLockContext } from "@/components/footerActionLockContext";
import { GameResultActions } from "@/components/GameResultActions";
import { GameShell } from "@/components/GameShell";
import type { RoomSyncPayload } from "@/domain/multiplayer/protocol";
import type { EmitWithAck } from "@/domain/multiplayer/protocol";
import { leaveMultiplayerRoomForHub } from "@/multiplayer/leaveRoomForHub";
import { buildMultiplayerReplayUi } from "@/multiplayer/replayUi";

type ReplaySync = RoomSyncPayload["replay"];

/**
 * Standard wrapper around `GameShell` used by every multiplayer view
 * (Hat / Who What Where / Imposter). Owns the
 * `FooterActionLockContext.Provider value={false}` so footer buttons in
 * networked play do not gate themselves on the local action-lock timer.
 */
export function MultiplayerGameShell({
  title,
  headerRight,
  footer,
  children,
}: {
  readonly title: string;
  readonly headerRight?: ReactNode;
  readonly footer: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <FooterActionLockContext.Provider value={false}>
      <GameShell footer={footer} headerRight={headerRight} title={title}>
        {children}
      </GameShell>
    </FooterActionLockContext.Provider>
  );
}

/**
 * Shared "pick another game / replay" footer used after the final scores
 * pane in every multiplayer view. Identical wiring across Hat, Who What Where,
 * and Imposter — extracted to remove the largest cross-file Fallow clone.
 */
export function MultiplayerEndGameActions({
  emitWithAck,
  isHost,
  replaySync,
  viewerPlayerId,
}: {
  readonly emitWithAck: EmitWithAck;
  readonly isHost: boolean;
  readonly replaySync: ReplaySync;
  readonly viewerPlayerId: string;
}) {
  const navigate = useNavigate();

  return (
    <GameResultActions
      onPickAnotherGame={() => {
        void leaveMultiplayerRoomForHub(emitWithAck, navigate);
      }}
      replay={buildMultiplayerReplayUi({
        ...replaySync,
        viewerId: viewerPlayerId,
        isHost,
        emitWithAck,
      })}
    />
  );
}
