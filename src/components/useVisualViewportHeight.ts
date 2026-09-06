import { useEffect, useState } from "react";

function currentVisualViewportHeight() {
  if (typeof window === "undefined" || !window.visualViewport) return null;
  return Math.round(window.visualViewport.height);
}

/** Keep sticky game actions above mobile software keyboards that resize the visual viewport. */
export function useVisualViewportHeight() {
  const [height, setHeight] = useState<number | null>(currentVisualViewportHeight);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport || typeof viewport.addEventListener !== "function") return undefined;
    const updateHeight = () => setHeight(Math.round(viewport.height));
    updateHeight();
    viewport.addEventListener("resize", updateHeight);
    return () => viewport.removeEventListener?.("resize", updateHeight);
  }, []);

  return height;
}
