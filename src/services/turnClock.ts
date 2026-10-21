/** Monotonic elapsed time only. A device wall-clock change must never consume a turn. */
export function remainingTurnMs(remainingMs: number, anchor: number, now: number): number {
  return Math.max(0, remainingMs - Math.max(0, now - anchor));
}

/** Domain engines still accept ISO deadlines; derive one from the durable remaining budget. */
export function turnDeadline(remainingMs: number, now = Date.now()): string {
  return new Date(now + Math.max(0, remainingMs)).toISOString();
}
