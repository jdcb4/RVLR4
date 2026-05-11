import { useEffect, useRef, useState } from "react";

import { IMPOSTER_ROLE_CARD_COPY } from "@/config/imposterDefaults";
import { cn } from "@/lib/utils";

/**
 * Clue-round helper: blank face until tapped, then shows role/word briefly (privacy-first).
 */
export function ImposterRemindMeCard({
  isImposter,
  secretWord,
}: {
  readonly isImposter: boolean;
  readonly secretWord: string;
}) {
  const [flipped, setFlipped] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const revealThenHide = () => {
    setFlipped(true);
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setFlipped(false);
      hideTimerRef.current = null;
    }, 3000);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 text-typ-ui text-muted-foreground">
        Forgotten your role? Tap here to check. Be careful not to let anyone see it.
      </p>
      <button
        className={cn(
          "relative min-h-[88px] w-full rounded-md border-2 border-dashed border-border bg-muted/30 p-4 text-left transition-colors",
          flipped && "border-primary bg-background",
        )}
        type="button"
        onClick={() => {
          if (!flipped) {
            revealThenHide();
          }
        }}
      >
        {!flipped ? (
          <span aria-hidden className="text-typ-ui text-muted-foreground">
            {"\u00a0"}
          </span>
        ) : (
          <span className="text-typ-metric font-semibold text-foreground">
            {isImposter ? IMPOSTER_ROLE_CARD_COPY : secretWord}
          </span>
        )}
      </button>
    </div>
  );
}
