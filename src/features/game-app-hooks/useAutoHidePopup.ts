import { useEffect } from "react";

/**
 * Auto-hides an info popup after `delayMs` (default 5s). Used by both Hat and
 * Imposter pass-and-play to dismiss a transient overlay without forcing the
 * user to tap to close.
 */
export function useAutoHidePopup(open: boolean, onClose: () => void, delayMs = 5000): void {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const timeout = window.setTimeout(onClose, delayMs);

    return () => window.clearTimeout(timeout);
  }, [open, onClose, delayMs]);
}
