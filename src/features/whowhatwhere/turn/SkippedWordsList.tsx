import { useRef } from "react";

import { Button } from "@/components/ui/button";
import type { SkippedWord } from "@/domain/whowhatwhere/types";
import { useWordListOverflow } from "@/features/game-app-hooks/useWordListOverflow";

/** Keep every pending word reachable and report actual hidden rows, including wrapped words. */
export function SkippedWordsList({
  words,
  currentSkippedId,
  onReturnSkipped,
}: {
  readonly words: readonly SkippedWord[];
  readonly currentSkippedId: string | undefined;
  readonly onReturnSkipped: (id: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const overflowCue = useWordListOverflow(listRef, words);

  return (
    <section className="flex min-h-0 min-w-0 flex-col" aria-label="Skipped words">
      <h2 className="mb-2 shrink-0 text-typ-ui font-semibold">Skipped · {words.length}</h2>
      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        tabIndex={words.length > 0 ? 0 : undefined}
        role="region"
        aria-label="Skipped words, scroll to see more"
      >
        {words.length > 0 ? (
          <ul className="grid gap-1">
            {words.map((skipped) => (
              <li key={skipped.id}>
                <Button
                  variant="outline"
                  className="min-h-12 w-full flex-col items-start gap-0 border-semantic-skipped-border bg-semantic-skipped-bg px-2 text-left text-semantic-skipped-foreground shadow-none disabled:opacity-100 [overflow-wrap:anywhere]"
                  disabled={skipped.id === currentSkippedId}
                  onClick={() => onReturnSkipped(skipped.id)}
                >
                  <span className="w-full">{skipped.word.word}</span>
                  {skipped.id === currentSkippedId ? (
                    <span className="text-typ-meta">In play</span>
                  ) : null}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2 text-typ-ui text-muted-foreground">None yet</p>
        )}
      </div>
      <p className="mt-1 min-h-5 shrink-0 text-typ-meta text-muted-foreground">{overflowCue}</p>
    </section>
  );
}
