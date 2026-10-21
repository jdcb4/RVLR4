import { type RefObject, useLayoutEffect, useState } from "react";

/** Measure rows rather than assuming a line height, so large text keeps accurate cues. */
export function useWordListOverflow(
  listRef: RefObject<HTMLDivElement | null>,
  words: readonly unknown[],
) {
  const [overflow, setOverflow] = useState({ above: 0, below: 0 });

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    function measure() {
      if (!list) return;
      const viewport = list.getBoundingClientRect();
      let above = 0;
      let below = 0;
      for (const row of list.querySelectorAll("li")) {
        const bounds = row.getBoundingClientRect();
        if (bounds.top < viewport.top - 1) above += 1;
        if (bounds.bottom > viewport.bottom + 1) below += 1;
      }
      setOverflow((previous) =>
        previous.above === above && previous.below === below ? previous : { above, below },
      );
    }

    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(list);
    for (const row of list.querySelectorAll("li")) observer?.observe(row);
    list.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      list.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [listRef, words]);

  const cues = [
    overflow.above > 0 ? `+${overflow.above} above` : null,
    overflow.below > 0 ? `+${overflow.below} below` : null,
  ].filter(Boolean);
  return cues.length > 0 ? `${cues.join(" · ")} · scroll` : "";
}
