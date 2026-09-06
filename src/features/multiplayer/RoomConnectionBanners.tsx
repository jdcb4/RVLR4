import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export function RoomConnectionBanners({
  connected,
  shuttingDown,
  children,
  active = true,
}: {
  readonly connected: boolean;
  readonly shuttingDown: boolean;
  readonly children: ReactNode;
  readonly active?: boolean;
}) {
  const showOfflineBanner = useDelayedOfflineBanner(connected || !active);

  return (
    <>
      {shuttingDown && active ? <ShutdownBanner /> : null}
      {!shuttingDown && showOfflineBanner ? <OfflineBanner /> : null}
      {children}
    </>
  );
}

function useDelayedOfflineBanner(connected: boolean) {
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

  return showOfflineBanner;
}

function ShutdownBanner() {
  return (
    <div
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 bg-primary px-4 py-2 text-center text-typ-ui text-primary-foreground shadow-md"
      role="status"
    >
      The server is restarting. This room will be lost; the host will need to create a new room.
    </div>
  );
}

function OfflineBanner() {
  return (
    <div
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 bg-muted px-4 py-2 text-center text-typ-ui text-muted-foreground shadow-md"
      role="status"
    >
      Reconnecting...
    </div>
  );
}
