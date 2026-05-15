import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { WhoWhatWhereSingleplayerController } from "@/features/whowhatwhere/useWhoWhatWhereSingleplayerApp";
import { WhoWhatWhereFooter } from "@/features/whowhatwhere/WhoWhatWhereSingleplayerChrome";

function buildGame(
  overrides: Partial<WhoWhatWhereSingleplayerController> = {},
): WhoWhatWhereSingleplayerController {
  return {
    activeMode: "landing",
    pendingMatch: null,
    confirmDiscardPending: false,
    goToSettingsFromLanding: vi.fn(),
    setConfirmDiscardPending: vi.fn(),
    startOverFromPendingMatch: vi.fn(),
    ...overrides,
  } as unknown as WhoWhatWhereSingleplayerController;
}

describe("WhoWhatWhereFooter", () => {
  it("starts a fresh game when there is no pending save", async () => {
    const user = userEvent.setup();
    const goToSettingsFromLanding = vi.fn();

    render(
      <WhoWhatWhereFooter
        game={buildGame({ goToSettingsFromLanding })}
        onPickAnotherGame={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start game" }));

    expect(goToSettingsFromLanding).toHaveBeenCalledOnce();
  });

  it("asks for discard confirmation when a pending save exists", async () => {
    const user = userEvent.setup();
    const setConfirmDiscardPending = vi.fn();

    render(
      <WhoWhatWhereFooter
        game={buildGame({
          pendingMatch: {
            savedAt: "2026-05-14T00:00:00.000Z",
            match: {} as never,
          },
          setConfirmDiscardPending,
        })}
        onPickAnotherGame={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start new game" }));

    expect(setConfirmDiscardPending).toHaveBeenCalledWith(true);
  });

  it("renders cancel and discard actions after discard confirmation", async () => {
    const user = userEvent.setup();
    const setConfirmDiscardPending = vi.fn();
    const startOverFromPendingMatch = vi.fn();

    render(
      <WhoWhatWhereFooter
        game={buildGame({
          confirmDiscardPending: true,
          pendingMatch: {
            savedAt: "2026-05-14T00:00:00.000Z",
            match: {} as never,
          },
          setConfirmDiscardPending,
          startOverFromPendingMatch,
        })}
        onPickAnotherGame={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Discard saved game" }));

    expect(setConfirmDiscardPending).toHaveBeenCalledWith(false);
    expect(startOverFromPendingMatch).toHaveBeenCalledOnce();
  });
});
