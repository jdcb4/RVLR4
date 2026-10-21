import { type RefObject, useLayoutEffect, useState } from "react";

/** Measure rows rather than assuming a line height, so large text keeps accurate cues. */
export function useWordListOverflow(
  listRef: RefObject<HTMLDivElement | null>,
  words: readonly unknown[],
) {
  const [hiddenCount, setHiddenCount] = useState(0);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    function measure() {
      if (!list) return;
      const viewport = list.getBoundingClientRect();
      let hidden = 0;
      for (const row of list.querySelectorAll("li")) {
        const bounds = row.getBoundingClientRect();
        if (bounds.top < viewport.top - 1 || bounds.bottom > viewport.bottom + 1) hidden += 1;
      }
      setHiddenCount(hidden);
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

  return hiddenCount > 0 ? `+${hiddenCount} others` : "";
}
