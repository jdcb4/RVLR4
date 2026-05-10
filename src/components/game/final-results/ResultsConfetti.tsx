import { useMemo } from "react";

/**
 * Lightweight celebration overlay — CSS-only, no extra dependencies (see `docs/DECISIONS.md`).
 * Fixed to the viewport; pointer-events none so footer buttons still work.
 */
export function ResultsConfetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 52 }, (_, index) => ({
        id: index,
        /** Spread across width */
        leftPct: ((index * 17) % 100) + (index % 3) * 0.7,
        delaySec: (index % 14) * 0.07,
        durationSec: 2.4 + (index % 6) * 0.35,
        /** Rotate hue for variety */
        hue: (index * 41 + 15) % 360,
        wide: index % 4 === 0,
      })),
    [],
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9] overflow-hidden"
      aria-hidden
    >
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={`animate-confetti-fall absolute top-[-12vh] rounded-[2px] opacity-90 shadow-sm ${
            piece.wide ? "h-3 w-4" : "h-4 w-2.5"
          }`}
          style={{
            left: `${piece.leftPct}%`,
            animationDelay: `${piece.delaySec}s`,
            animationDuration: `${piece.durationSec}s`,
            backgroundColor: `hsl(${piece.hue} 72% 52%)`,
          }}
        />
      ))}
    </div>
  );
}
