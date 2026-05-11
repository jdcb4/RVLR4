/**
 * Who What Where turn clock — always `m:ss` so describers and guessers see the same shape.
 */
export function formatWwwTurnClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
