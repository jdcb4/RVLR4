import { useEffect, useState } from "react";

import { FOOTER_ACTION_LOCK_MS } from "@/components/footerActionLockContext";

/**
 * Pass-and-play anti-double-tap helper.
 *
 * Every time `key` changes, footer actions lock for `FOOTER_ACTION_LOCK_MS`
 * before re-enabling. Callers supply a stringified key composed of whatever
 * state transitions should debounce the footer (step, phase, reveal flags,
 * etc.). Returns the current `locked` boolean to drive
 * `FooterActionLockContext`.
 */
export function useFooterActionLockOnKeyChange(key: string): boolean {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setLocked(true);
    const timeout = window.setTimeout(
      () => setLocked(false),
      FOOTER_ACTION_LOCK_MS,
    );

    return () => window.clearTimeout(timeout);
  }, [key]);

  return locked;
}
