import { QRCode } from "react-qr-code";

import { IconClipboard, IconQrCode, IconShare } from "@/components/icons";
import { ModalDialog } from "@/components/ModalDialog";
import { Button } from "@/components/ui/button";

export function LobbyInviteSection({
  code,
  connected,
  canNativeShare,
  copiedToast,
  compact = false,
  onCopyLink,
  onShareLink,
  onOpenQrToast,
}: {
  readonly code: string;
  readonly connected: boolean;
  readonly canNativeShare: boolean;
  readonly copiedToast: boolean;
  readonly compact?: boolean;
  readonly onCopyLink: () => Promise<void>;
  readonly onShareLink: () => Promise<void>;
  readonly onOpenQrToast: () => void;
}) {
  return (
    <>
      <section
        className={`rounded-2xl border border-border bg-card shadow-sm ${compact ? "p-3" : "p-4"}`}
        data-compact={compact || undefined}
      >
        <p className="text-typ-overline text-primary">Share code</p>
        <div className={`${compact ? "mt-2" : "mt-3"} flex flex-wrap items-center gap-x-4 gap-y-2`}>
          <span className="font-mono text-typ-display font-bold tracking-[0.25em]">{code}</span>
          <span className="flex items-center gap-2">
            <Button
              aria-label="Copy invite link"
              size="icon"
              variant="outline"
              onClick={() => void onCopyLink()}
            >
              <IconClipboard className="size-5" />
            </Button>
            <Button
              aria-label={
                canNativeShare ? "Share invite link" : "Share invite link (falls back to copy)"
              }
              size="icon"
              variant="outline"
              onClick={() => void onShareLink()}
            >
              <IconShare className="size-5" />
            </Button>
            <Button aria-label="Show QR code" size="icon" variant="outline" onClick={onOpenQrToast}>
              <IconQrCode className="size-5" />
            </Button>
          </span>
        </div>
        <p className="mt-2 text-typ-ui-snug text-muted-foreground">
          Connection: {connected ? "live" : "reconnecting..."}
        </p>
      </section>

      {copiedToast ? (
        <div
          className="fixed bottom-24 left-1/2 z-40 max-w-sm -translate-x-1/2 rounded-xl border border-border bg-card px-4 py-3 text-typ-ui shadow-lg"
          role="status"
        >
          Link copied to clipboard
        </div>
      ) : null}
    </>
  );
}

export function QrJoinDialog({
  joinLink,
  onClose,
}: {
  readonly joinLink: string;
  readonly onClose: () => void;
}) {
  return (
    <ModalDialog title="Scan to join" onClose={onClose}>
      <p className="mt-1 text-typ-ui-snug text-muted-foreground">
        Opens the name screen with this room code filled in.
      </p>
      <div className="mt-4 flex justify-center rounded-xl bg-white p-4">
        <QRCode size={200} value={joinLink} title="Room invitation QR code" />
      </div>
    </ModalDialog>
  );
}
