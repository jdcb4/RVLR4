import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { PrimaryFooterButton } from "@/components/game/GameFooterButtons";
import { GameShell } from "@/components/GameShell";
import { HatMultiplayerView } from "@/features/hat-game/multiplayer/HatMultiplayerView";
import { ImposterMultiplayerView } from "@/features/imposter/multiplayer/ImposterMultiplayerView";
import { RoomLobbyView } from "@/features/multiplayer/RoomLobbyView";
import { WhoWhatWhereMultiplayerView } from "@/features/whowhatwhere/multiplayer/WhoWhatWhereMultiplayerView";
import { clearActiveGameBookmark, writeActiveGameBookmark } from "@/multiplayer/activeGameBookmark";
import { useRoomChannel } from "@/multiplayer/useRoomChannel";

function shareUrl(code: string) {
  const url = new URL(window.location.origin);

  url.pathname = "/name";
  url.searchParams.set("intent", "join");
  url.searchParams.set("code", code);

  return url.toString();
}

export function RoomPage() {
  const navigate = useNavigate();
  const params = useParams();
  const code = params.code?.toUpperCase();
  const { sync, bindError, emitWithAck, connected, shuttingDown } = useRoomChannel(
    code,
    Boolean(code),
  );
  const playingBookmarkCommittedRef = useRef(false);

  useEffect(() => {
    if (!sync) {
      return undefined;
    }

    if (sync.phase === "lobby" || sync.phase === "ended") {
      playingBookmarkCommittedRef.current = false;
      clearActiveGameBookmark();

      return undefined;
    }

    if (sync.phase === "playing" && !playingBookmarkCommittedRef.current) {
      playingBookmarkCommittedRef.current = true;
      writeActiveGameBookmark({
        code: sync.code,
        gameKind: sync.gameKind,
        startedAtIso: new Date().toISOString(),
      });
    }

    return undefined;
  }, [sync]);
  const [startError, setStartError] = useState<string | null>(null);
  const [qrToastOpen, setQrToastOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const copyToastTimer = useRef<number | null>(null);

  const joinLink = useMemo(() => (code ? shareUrl(code) : ""), [code]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinLink);
      setCopiedToast(true);

      if (copyToastTimer.current) {
        window.clearTimeout(copyToastTimer.current);
      }

      copyToastTimer.current = window.setTimeout(() => {
        setCopiedToast(false);
      }, 2200);
    } catch {
      setStartError("Clipboard blocked — copy manually.");
    }
  };

  /**
   * Native share-sheet (iOS / Android / Edge desktop). Fires the OS share
   * UI so the host can send the join link via Messages, WhatsApp, etc.
   * Browsers that don't expose `navigator.share` fall back to copying the
   * link to the clipboard so the button is never inert.
   */
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleShareLink = async () => {
    if (!joinLink) {
      return;
    }

    if (canNativeShare) {
      try {
        await navigator.share({
          title: "Join my RVLRY room",
          text: `Join my game on RVLRY — code ${sync?.code ?? ""}`,
          url: joinLink,
        });
      } catch {
        // User cancelled or share unavailable mid-flight — silent.
      }
      return;
    }

    await handleCopyLink();
  };

  const handleStartGame = async () => {
    setStartError(null);
    const ack = await emitWithAck("lobby:startGame");

    if (ack?.ok === false) {
      setStartError(ack.error ?? "Unable to start yet.");
    }
  };

  useEffect(() => {
    return () => {
      if (copyToastTimer.current) {
        window.clearTimeout(copyToastTimer.current);
      }
    };
  }, []);

  // Delay the "Reconnecting..." banner so a transient blip during a real
  // navigation/hot-reload does not flash a misleading status. Two seconds
  // matches the eye's threshold for "this is taking a while" without being
  // long enough to hide a real outage.
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  useEffect(() => {
    if (connected) {
      setShowOfflineBanner(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setShowOfflineBanner(true);
    }, 2000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [connected]);

  // Banner priority: bindError (fatal — full screen elsewhere) > shutdown
  // (server is about to disconnect) > offline (transient drop). bindError
  // doesn't render here because the `if (bindError)` branch below renders its
  // own full-page screen with the same message — shutdown/offline still get
  // wrapped by `wrapWithBanners`.
  const shutdownBanner = shuttingDown ? (
    <div
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 bg-primary px-4 py-2 text-center text-typ-ui text-primary-foreground shadow-md"
      role="status"
    >
      The server is restarting — keep this tab open, the room will reopen in a moment.
    </div>
  ) : null;

  const offlineBanner =
    !shuttingDown && showOfflineBanner ? (
      <div
        aria-live="polite"
        className="fixed inset-x-0 top-0 z-50 bg-muted px-4 py-2 text-center text-typ-ui text-muted-foreground shadow-md"
        role="status"
      >
        Reconnecting…
      </div>
    ) : null;

  const wrapWithBanners = (body: React.ReactNode) => (
    <>
      {shutdownBanner}
      {offlineBanner}
      {body}
    </>
  );

  if (!code) {
    return wrapWithBanners(
      <GameShell footer={null} title="Room">
        <p className="text-typ-body-relaxed text-muted-foreground">Missing room code.</p>
      </GameShell>,
    );
  }

  if (bindError) {
    return wrapWithBanners(
      <GameShell
        footer={<PrimaryFooterButton label="Back to home" onClick={() => navigate("/")} />}
        title="Reconnect"
      >
        <p className="text-typ-body-relaxed text-destructive">{bindError}</p>
        <p className="mt-2 text-typ-ui text-muted-foreground">
          If you just left, ask the host for the code and join again with the same display name if
          the room is still in the lobby.
        </p>
      </GameShell>,
    );
  }

  if (!sync) {
    return wrapWithBanners(
      <GameShell footer={null} title="Connecting">
        <p className="text-typ-body-relaxed text-muted-foreground">
          {connected ? "Syncing your table..." : "Connecting to the host..."}
        </p>
      </GameShell>,
    );
  }

  if (sync.phase === "playing" && sync.gameKind === "hat" && sync.hat) {
    return wrapWithBanners(
      <HatMultiplayerView
        emitWithAck={emitWithAck}
        isHost={sync.you.isHost}
        payload={sync.hat}
        replaySync={sync.replay}
        viewerPlayerId={sync.you.playerId}
      />,
    );
  }

  if (sync.phase === "playing" && sync.gameKind === "imposter" && sync.imposter) {
    return wrapWithBanners(
      <ImposterMultiplayerView
        emitWithAck={emitWithAck}
        isHost={sync.you.isHost}
        payload={sync.imposter}
        replaySync={sync.replay}
        viewerPlayerId={sync.you.playerId}
      />,
    );
  }

  if (sync.phase === "playing" && sync.gameKind === "whowhatwhere" && sync.www) {
    return wrapWithBanners(
      <WhoWhatWhereMultiplayerView
        emitWithAck={emitWithAck}
        isHost={sync.you.isHost}
        payload={sync.www}
        replaySync={sync.replay}
        viewerPlayerId={sync.you.playerId}
      />,
    );
  }

  if (sync.phase === "ended") {
    return wrapWithBanners(
      <GameShell
        footer={<PrimaryFooterButton label="Back to home" onClick={() => navigate("/")} />}
        title="Table closed"
      >
        <p className="text-typ-body-relaxed text-muted-foreground">
          This room is finished — everyone left from the score screen or the match was cleared. You
          can host or join a new game from the home page.
        </p>
      </GameShell>,
    );
  }

  if (sync.phase === "lobby" && sync.lobby) {
    return wrapWithBanners(
      <RoomLobbyView
        canNativeShare={canNativeShare}
        connected={connected}
        copiedToast={copiedToast}
        emitWithAck={emitWithAck}
        joinLink={joinLink}
        lobby={sync.lobby}
        qrToastOpen={qrToastOpen}
        startError={startError}
        sync={sync}
        onCloseQrToast={() => setQrToastOpen(false)}
        onCopyLink={handleCopyLink}
        onOpenQrToast={() => setQrToastOpen(true)}
        onShareLink={handleShareLink}
        onStartGame={handleStartGame}
      />,
    );
  }

  return wrapWithBanners(
    <GameShell footer={null} title="Room">
      <p className="text-typ-ui text-muted-foreground">Waiting for host instructions...</p>
    </GameShell>,
  );
}
