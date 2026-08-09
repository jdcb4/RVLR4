import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccessibleCountdownValue } from "@/components/game/AccessibleCountdownValue";

describe("AccessibleCountdownValue", () => {
  it("announces only the final-ten-seconds milestone and expiry", () => {
    const { rerender } = render(
      <AccessibleCountdownValue countdownKey="turn-1" formattedValue="11s" secondsLeft={11} />,
    );
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();

    rerender(
      <AccessibleCountdownValue countdownKey="turn-1" formattedValue="10s" secondsLeft={10} />,
    );
    expect(liveRegion).toHaveTextContent("10 seconds remaining.");

    rerender(
      <AccessibleCountdownValue countdownKey="turn-1" formattedValue="9s" secondsLeft={9} />,
    );
    expect(liveRegion).toHaveTextContent("10 seconds remaining.");

    rerender(
      <AccessibleCountdownValue countdownKey="turn-1" formattedValue="0s" secondsLeft={0} />,
    );
    expect(liveRegion).toHaveTextContent("Time is up.");
  });

  it("resets milestones for a new turn and announces a late first view", () => {
    const { rerender } = render(
      <AccessibleCountdownValue countdownKey="turn-1" formattedValue="5s" secondsLeft={5} />,
    );
    expect(screen.getByText("5 seconds remaining.")).toBeInTheDocument();

    rerender(
      <AccessibleCountdownValue countdownKey="turn-2" formattedValue="8s" secondsLeft={8} />,
    );
    expect(screen.getByText("8 seconds remaining.")).toBeInTheDocument();
  });
});
