import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export function RoomConnectionBanners({
  connected,
  shuttingDown,
  children,
}: {
  readonly connected: boolean;
  readonly shuttingDown: boolean;
  readonly children: ReactNode;
}) {
  const showOfflineBanner = useDelayedOfflineBanner(connected);

  return (
    <>
      {shuttingDown ? <ShutdownBanner /> : null}
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
      The server is restarting - keep this tab open, the room will reopen in a moment.
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
