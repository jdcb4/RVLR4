import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useVisualViewportHeight } from "@/components/useVisualViewportHeight";

describe("useVisualViewportHeight", () => {
  const originalVisualViewport = Object.getOwnPropertyDescriptor(window, "visualViewport");

  afterEach(() => {
    if (originalVisualViewport) {
      Object.defineProperty(window, "visualViewport", originalVisualViewport);
    } else {
      Reflect.deleteProperty(window, "visualViewport");
    }
  });

  it("tracks visual viewport resizes caused by an on-screen keyboard", () => {
    const visualViewport = new EventTarget() as VisualViewport;
    Object.defineProperty(visualViewport, "height", { configurable: true, value: 640 });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: visualViewport,
    });

    const { result } = renderHook(() => useVisualViewportHeight());
    expect(result.current).toBe(640);

    Object.defineProperty(visualViewport, "height", { configurable: true, value: 412 });
    act(() => visualViewport.dispatchEvent(new Event("resize")));
    expect(result.current).toBe(412);
  });

  it("uses the available height when viewport resize events are not implemented", () => {
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: { height: 568 } as VisualViewport,
    });

    const { result } = renderHook(() => useVisualViewportHeight());
    expect(result.current).toBe(568);
  });
});
