import { useEffect, useMemo, useRef, useState } from "react";

import type { RoomSyncPayload } from "@/domain/multiplayer/protocol";
import type { EmitWithAck } from "@/domain/multiplayer/protocol";

import { buildRoomShareUrl } from "./roomInvite";

export function useRoomInviteControls({
  code,
  sync,
  emitWithAck,
}: {
  readonly code: string | undefined;
  readonly sync: RoomSyncPayload | null;
  readonly emitWithAck: EmitWithAck;
}) {
  const [startError, setStartError] = useState<string | null>(null);
  const [qrToastOpen, setQrToastOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const copyToastTimer = useRef<number | null>(null);

  const joinLink = useMemo(() => (code ? buildRoomShareUrl(code) : ""), [code]);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

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
      setStartError("Clipboard blocked - copy manually.");
    }
  };

  const handleShareLink = async () => {
    if (!joinLink) {
      return;
    }

    if (canNativeShare) {
      try {
        await navigator.share({
          title: "Join my RVLRY room",
          text: `Join my game on RVLRY - code ${sync?.code ?? ""}`,
          url: joinLink,
        });
      } catch {
        // User cancelled or share unavailable mid-flight.
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

  return {
    canNativeShare,
    copiedToast,
    joinLink,
    qrToastOpen,
    startError,
    closeQrToast: () => setQrToastOpen(false),
    copyLink: handleCopyLink,
    openQrToast: () => setQrToastOpen(true),
    shareLink: handleShareLink,
    startGame: handleStartGame,
  };
}
