import { createContext } from "react";

/** Matches footer primary-disable timing used across games (pass-and-play anti-double-tap). */
export const FOOTER_ACTION_LOCK_MS = 500;

/** When true, footer action buttons should ignore presses briefly after navigation/state jumps. */
export const FooterActionLockContext = createContext(false);
