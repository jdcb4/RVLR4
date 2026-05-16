import { useNavigate, useParams } from "react-router-dom";

import { PrimaryFooterButton } from "@/components/game/GameFooterButtons";
import { GameShell } from "@/components/GameShell";
import { HatMultiplayerView } from "@/features/hat-game/multiplayer/HatMultiplayerView";
import { ImposterMultiplayerView } from "@/features/imposter/multiplayer/ImposterMultiplayerView";
import { RoomConnectionBanners } from "@/features/multiplayer/RoomConnectionBanners";
import { RoomLobbyView } from "@/features/multiplayer/RoomLobbyView";
import { useActiveRoomBookmark } from "@/features/multiplayer/useActiveRoomBookmark";
import { useRoomInviteControls } from "@/features/multiplayer/useRoomInviteControls";
import { WhoWhatWhereMultiplayerView } from "@/features/whowhatwhere/multiplayer/WhoWhatWhereMultiplayerView";
import type { RoomSyncPayload } from "@/multiplayer/roomTypes";
import { useRoomChannel } from "@/multiplayer/useRoomChannel";

type EmitWithAck = (
  event: string,
  body?: unknown,
) => Promise<{ ok?: boolean; error?: string } | undefined>;

export function RoomPage() {
  const navigate = useNavigate();
  const params = useParams();
  const code = params.code?.toUpperCase();
  const { sync, bindError, emitWithAck, connected, shuttingDown } = useRoomChannel(
    code,
    Boolean(code),
  );
  const invite = useRoomInviteControls({ code, emitWithAck, sync });

  useActiveRoomBookmark(sync);

  return (
    <RoomConnectionBanners connected={connected} shuttingDown={shuttingDown}>
      <RoomPageContent
        bindError={bindError}
        code={code}
        connected={connected}
        emitWithAck={emitWithAck}
        invite={invite}
        sync={sync}
        onBackHome={() => navigate("/")}
      />
    </RoomConnectionBanners>
  );
}

export function RoomPageContent({
  code,
  bindError,
  sync,
  connected,
  invite,
  emitWithAck,
  onBackHome,
}: {
  readonly code: string | undefined;
  readonly bindError: string | null;
  readonly sync: RoomSyncPayload | null;
  readonly connected: boolean;
  readonly invite: ReturnType<typeof useRoomInviteControls>;
  readonly emitWithAck: EmitWithAck;
  readonly onBackHome: () => void;
}) {
  if (!code) {
    return (
      <GameShell footer={null} title="Room">
        <p className="text-typ-body-relaxed text-muted-foreground">Missing room code.</p>
      </GameShell>
    );
  }

  if (bindError) {
    return (
      <GameShell
        footer={<PrimaryFooterButton label="Back to home" onClick={onBackHome} />}
        title="Reconnect"
      >
        <p className="text-typ-body-relaxed text-destructive">{bindError}</p>
        <p className="mt-2 text-typ-ui text-muted-foreground">
          If you just left, ask the host for the code and join again with the same display name if
          the room is still in the lobby.
        </p>
      </GameShell>
    );
  }

  if (!sync) {
    return (
      <GameShell footer={null} title="Connecting">
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
    return <PlayingRoomView emitWithAck={emitWithAck} sync={sync} />;
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
}: {
  readonly sync: RoomSyncPayload;
  readonly emitWithAck: EmitWithAck;
}) {
  const gameView = {
    hat: sync.hat ? (
      <HatMultiplayerView
        emitWithAck={emitWithAck}
        isHost={sync.you.isHost}
        payload={sync.hat}
        replaySync={sync.replay}
        viewerPlayerId={sync.you.playerId}
      />
    ) : null,
    imposter: sync.imposter ? (
      <ImposterMultiplayerView
        emitWithAck={emitWithAck}
        isHost={sync.you.isHost}
        payload={sync.imposter}
        replaySync={sync.replay}
        viewerPlayerId={sync.you.playerId}
      />
    ) : null,
    whowhatwhere: sync.www ? (
      <WhoWhatWhereMultiplayerView
        emitWithAck={emitWithAck}
        isHost={sync.you.isHost}
        payload={sync.www}
        replaySync={sync.replay}
        viewerPlayerId={sync.you.playerId}
      />
    ) : null,
    drawnguess: null,
  }[sync.gameKind];

  return (
    gameView ?? (
      <GameShell footer={null} title="Room">
        <p className="text-typ-ui text-muted-foreground">Waiting for host instructions...</p>
      </GameShell>
    )
  );
}
