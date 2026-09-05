import { useNavigate, useParams } from "react-router-dom";

import { PrimaryFooterButton, SecondaryFooterButton } from "@/components/game/GameFooterButtons";
import { GameShell } from "@/components/GameShell";
import { Button } from "@/components/ui/button";
import type { RoomSyncPayload } from "@/domain/multiplayer/protocol";
import type { EmitWithAck } from "@/domain/multiplayer/protocol";
import { DrawNGuessMultiplayerView } from "@/features/drawnguess/multiplayer/DrawNGuessMultiplayerView";
import { HatMultiplayerView } from "@/features/hat-game/multiplayer/HatMultiplayerView";
import { ImposterMultiplayerView } from "@/features/imposter/multiplayer/ImposterMultiplayerView";
import { RoomConnectionBanners } from "@/features/multiplayer/RoomConnectionBanners";
import { RoomLobbyView } from "@/features/multiplayer/RoomLobbyView";
import { RoomOptions } from "@/features/multiplayer/RoomOptions";
import { useActiveRoomBookmark } from "@/features/multiplayer/useActiveRoomBookmark";
import { useRoomInviteControls } from "@/features/multiplayer/useRoomInviteControls";
import { WhoWhatWhereMultiplayerView } from "@/features/whowhatwhere/multiplayer/WhoWhatWhereMultiplayerView";
import { useRoomChannel } from "@/multiplayer/useRoomChannel";

export function RoomPage() {
  const navigate = useNavigate();
  const params = useParams();
  const code = params.code?.toUpperCase();
  const {
    sync,
    bindError,
    bindErrorCode,
    emitWithAck,
    connected,
    shuttingDown,
    retryConnection,
    actionError,
    clearActionError,
  } = useRoomChannel(code, Boolean(code));
  const invite = useRoomInviteControls({ code, emitWithAck, sync });

  useActiveRoomBookmark(sync);

  return (
    <RoomConnectionBanners active={Boolean(sync)} connected={connected} shuttingDown={shuttingDown}>
      {actionError ? (
        <div
          role="alert"
          className="fixed inset-x-2 top-2 z-50 flex items-center justify-between gap-3 rounded-xl border border-destructive bg-background p-3 text-typ-ui text-destructive shadow-md"
        >
          <span>{actionError}</span>
          <Button type="button" variant="outline" onClick={clearActionError}>
            Dismiss
          </Button>
        </div>
      ) : null}
      <RoomPageContent
        bindError={bindError}
        bindErrorCode={bindErrorCode}
        code={code}
        connected={connected}
        emitWithAck={emitWithAck}
        invite={invite}
        sync={sync}
        onBackHome={() => navigate("/")}
        onRetryConnection={retryConnection}
      />
    </RoomConnectionBanners>
  );
}

export function RoomPageContent({
  code,
  bindError,
  bindErrorCode,
  sync,
  connected,
  invite,
  emitWithAck,
  onBackHome,
  onRetryConnection,
}: {
  readonly code: string | undefined;
  readonly bindError: string | null;
  readonly bindErrorCode?: string | null;
  readonly sync: RoomSyncPayload | null;
  readonly connected: boolean;
  readonly invite: ReturnType<typeof useRoomInviteControls>;
  readonly emitWithAck: EmitWithAck;
  readonly onBackHome: () => void;
  readonly onRetryConnection: () => void;
}) {
  if (!code) {
    return (
      <GameShell footer={null} title="Room">
        <p className="text-typ-body-relaxed text-muted-foreground">Missing room code.</p>
      </GameShell>
    );
  }

  if (bindError) {
    const roomLost = bindErrorCode === "ROOM_NOT_FOUND";
    const sessionLost = bindErrorCode === "SESSION_EXPIRED";
    return (
      <GameShell
        footer={
          <>
            {roomLost || sessionLost ? (
              <PrimaryFooterButton label="Host or join a new room" onClick={onBackHome} />
            ) : (
              <>
                <PrimaryFooterButton label="Retry connection" onClick={onRetryConnection} />
                <SecondaryFooterButton label="Back to home" onClick={onBackHome} />
              </>
            )}
          </>
        }
        title={roomLost ? "Room unavailable" : sessionLost ? "Session unavailable" : "Reconnect"}
      >
        <p role="alert" className="text-typ-body-relaxed text-destructive">
          {bindError}
        </p>
        <p className="mt-2 text-typ-ui text-muted-foreground">
          {roomLost ? (
            "Rooms are held in server memory and cannot be restored after a restart or expiry."
          ) : (
            <>
              To resume your seat, use the original tab and its saved session. A name alone cannot
              restore it. If that session is lost, ask the host to remove your away seat in Room
              options, then join again from the home page.
            </>
          )}
        </p>
      </GameShell>
    );
  }

  if (!sync) {
    return (
      <GameShell
        footer={<SecondaryFooterButton label="Back to home" onClick={onBackHome} />}
        title="Connecting"
      >
        <p className="text-typ-body-relaxed text-muted-foreground">
          {connected ? "Syncing your table..." : "Connecting to the host..."}
        </p>
      </GameShell>
    );
  }

  return (
    <SyncedRoomContent
      connected={connected}
      emitWithAck={emitWithAck}
      invite={invite}
      sync={sync}
      onBackHome={onBackHome}
    />
  );
}

export function SyncedRoomContent({
  sync,
  connected,
  invite,
  emitWithAck,
  onBackHome,
}: {
  readonly sync: RoomSyncPayload;
  readonly connected: boolean;
  readonly invite: ReturnType<typeof useRoomInviteControls>;
  readonly emitWithAck: EmitWithAck;
  readonly onBackHome: () => void;
}) {
  if (sync.phase === "ended") {
    return (
      <GameShell
        footer={<PrimaryFooterButton label="Back to home" onClick={onBackHome} />}
        title="Table closed"
      >
        <p className="text-typ-body-relaxed text-muted-foreground">
          This room is finished - everyone left from the score screen or the match was cleared. You
          can host or join a new game from the home page.
        </p>
      </GameShell>
    );
  }

  if (sync.phase === "playing") {
    return <PlayingRoomView emitWithAck={emitWithAck} sync={sync} connected={connected} />;
  }

  if (sync.phase === "lobby" && sync.lobby) {
    return (
      <RoomLobbyView
        canNativeShare={invite.canNativeShare}
        connected={connected}
        copiedToast={invite.copiedToast}
        emitWithAck={emitWithAck}
        joinLink={invite.joinLink}
        lobby={sync.lobby}
        qrToastOpen={invite.qrToastOpen}
        startError={invite.startError}
        sync={sync}
        onCloseQrToast={invite.closeQrToast}
        onCopyLink={invite.copyLink}
        onOpenQrToast={invite.openQrToast}
        onShareLink={invite.shareLink}
        onStartGame={invite.startGame}
      />
    );
  }

  return (
    <GameShell footer={null} title="Room">
      <p className="text-typ-ui text-muted-foreground">Waiting for host instructions...</p>
    </GameShell>
  );
}

export function PlayingRoomView({
  sync,
  emitWithAck,
  connected = true,
}: {
  readonly sync: RoomSyncPayload;
  readonly emitWithAck: EmitWithAck;
  readonly connected?: boolean;
}) {
  const roomControls = sync.you.isHost ? (
    <RoomOptions sync={sync} connected={connected} emitWithAck={emitWithAck} />
  ) : null;
  const gameView = {
    hat: sync.hat ? (
      <HatMultiplayerView
        roomControls={roomControls}
        emitWithAck={emitWithAck}
        isHost={sync.you.isHost}
        payload={sync.hat}
        replaySync={sync.replay}
        viewerPlayerId={sync.you.playerId}
      />
    ) : null,
    imposter: sync.imposter ? (
      <ImposterMultiplayerView
        roomControls={roomControls}
        emitWithAck={emitWithAck}
        isHost={sync.you.isHost}
        payload={sync.imposter}
        replaySync={sync.replay}
        viewerPlayerId={sync.you.playerId}
      />
    ) : null,
    whowhatwhere: sync.www ? (
      <WhoWhatWhereMultiplayerView
        roomControls={roomControls}
        emitWithAck={emitWithAck}
        isHost={sync.you.isHost}
        payload={sync.www}
        replaySync={sync.replay}
        viewerPlayerId={sync.you.playerId}
      />
    ) : null,
    drawnguess: sync.drawnguess ? (
      <DrawNGuessMultiplayerView
        roomControls={roomControls}
        emitWithAck={emitWithAck}
        isHost={sync.you.isHost}
        payload={sync.drawnguess}
        replaySync={sync.replay}
        viewerPlayerId={sync.you.playerId}
      />
    ) : null,
  }[sync.gameKind];

  return (
    gameView ?? (
      <GameShell footer={null} title="Room">
        <p className="text-typ-ui text-muted-foreground">Waiting for host instructions...</p>
      </GameShell>
    )
  );
}
