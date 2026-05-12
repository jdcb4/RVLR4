import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** Border + background tint per phase (Describe / One Word / Charades). */
function hatPhaseStyles(phaseNumber: number): string {
  switch (phaseNumber) {
    case 1:
      return "border-sky-500 bg-sky-500/15 text-sky-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] dark:border-sky-400 dark:bg-sky-500/25 dark:text-sky-50";
    case 2:
      return "border-amber-500 bg-amber-500/15 text-amber-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] dark:border-amber-400 dark:bg-amber-500/25 dark:text-amber-50";
    case 3:
      return "border-violet-500 bg-violet-500/15 text-violet-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] dark:border-violet-400 dark:bg-violet-500/25 dark:text-violet-50";
    default:
      return "border-border bg-muted/40 text-foreground";
  }
}

/**
 * Large phase readout for in-turn Hat Game screens. Flashes when
 * `phaseNumber` changes mid-turn — works for both Multi-Device (synced
 * from host) and Pass-and-Play (local engine transition).
 */
export function HatPhaseBanner({
  phaseNumber,
  phaseName,
  instruction,
}: {
  readonly phaseNumber: number;
  readonly phaseName: string;
  readonly instruction: string;
}) {
  const prevPhaseRef = useRef<number | undefined>(undefined);
  const [runFlash, setRunFlash] = useState(false);

  useLayoutEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phaseNumber;

    if (prev !== undefined && prev !== phaseNumber) {
      setRunFlash(true);
    }
  }, [phaseNumber]);

  useEffect(() => {
    if (!runFlash) {
      return undefined;
    }

    /** Matches `animate-hat-phase-flash` duration (5 × 0.22s); clears state if animation did not run. */
    const id = window.setTimeout(() => {
      setRunFlash(false);
    }, 1250);

    return () => window.clearTimeout(id);
  }, [runFlash]);

  return (
    <div
      aria-live="polite"
      className={cn(
        "rounded-2xl border-2 px-4 py-3 transition-colors",
        hatPhaseStyles(phaseNumber),
        runFlash && "motion-safe:animate-hat-phase-flash",
      )}
    >
      <p className="text-typ-overline opacity-90">Game phase</p>
      <p className="mt-1 text-typ-panel-title font-bold tracking-tight">
        Phase {phaseNumber}: {phaseName}
      </p>
      <p className="mt-2 text-typ-ui-snug opacity-95">{instruction}</p>
    </div>
  );
}
