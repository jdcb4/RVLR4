import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hatClueEntryScreen } from "@/features/hat-game/screens/hatClueEntryScreen";
import { createHatGalleryController, hatGallerySnapshots } from "@/ui-gallery/hatGalleryController";

describe("hatClueEntryScreen", () => {
  const originalScrollIntoView = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "scrollIntoView",
  );
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    scrollIntoView.mockReset();
    if (originalScrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoView);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
    }
  });

  it("keeps focused clue fields visible and advances Enter to the next clue", () => {
    const model = hatClueEntryScreen(createHatGalleryController(hatGallerySnapshots.clueForm));

    render(
      <section>
        {model.content}
        {model.actions}
      </section>,
    );

    const inputs = screen.getAllByPlaceholderText("Enter a famous figure");
    expect(inputs[0]).toHaveClass("h-11");
    expect(screen.getAllByRole("button", { name: "Lightning suggestion" })[0]).toHaveClass("h-11");

    inputs[0]!.focus();
    act(() => vi.advanceTimersByTime(250));
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    fireEvent.keyDown(inputs[0]!, { key: "Enter" });
    expect(inputs[1]).toHaveFocus();
  });
});
