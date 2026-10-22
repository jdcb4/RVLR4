import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ImposterDevicePage } from "@/features/imposter/ImposterDevicePage";
import { createImposterDeviceSession } from "@/features/imposter/imposterDeviceSession";
import { readSnapshot, writeSnapshot } from "@/services/nativeSnapshotStore";

const device = vi.hoisted(() => ({ activity: null as ((active: boolean) => void) | null }));
const saved = () => {
  const session = createImposterDeviceSession();
  return {
    ...session,
    snapshot: {
      ...session.snapshot,
      step: "reveal" as const,
      round: {
        secretWord: "Volcano",
        imposterPlayerIds: [session.snapshot.players[1]!.id],
        revealPlayerIndex: 0,
        revealRevealed: false as const,
      },
    },
  };
};
vi.mock("@/services/nativeSnapshotStore", () => ({
  readSnapshot: vi.fn(async () => ({ value: saved(), recovered: false })),
  writeSnapshot: vi.fn(async () => undefined),
}));
vi.mock("@/services/deviceLifecycle", () => ({
  isDeviceActive: () => true,
  setDevicePrivacy: vi.fn(async () => undefined),
  setDeviceKeepAwake: vi.fn(async () => undefined),
  subscribeDeviceActivity: (listener: (active: boolean) => void) => {
    device.activity = listener;
    listener(true);
    return () => {
      device.activity = null;
    };
  },
}));
beforeEach(() => {
  device.activity = null;
});
function mount() {
  return render(
    <MemoryRouter>
      <ImposterDevicePage />
    </MemoryRouter>,
  );
}

describe("Imposter device privacy flow", () => {
  it("selects difficulty in settings and retains it through review", async () => {
    vi.mocked(readSnapshot).mockResolvedValueOnce({ value: null, recovered: false });
    const user = userEvent.setup();
    mount();
    await screen.findByRole("heading", { name: "Game settings" });
    const difficulty = screen.getByRole("combobox", { name: "Difficulty" });
    expect(difficulty).toHaveValue("all");
    await user.selectOptions(difficulty, "medium");
    expect(difficulty).toHaveValue("medium");
    await user.click(screen.getByRole("button", { name: "Continue to players" }));
    await user.click(screen.getByRole("button", { name: "Review players" }));
    expect(screen.getByText("Difficulty: Medium")).toBeInTheDocument();
    expect(vi.mocked(writeSnapshot).mock.calls.at(-1)?.[1]).toMatchObject({
      snapshot: { step: "review", wordDifficulty: "medium" },
    });
  });

  it("keeps saved role content out of the document until Resume and private reveal", async () => {
    const user = userEvent.setup();
    mount();
    await screen.findByRole("heading", { name: "Your saved game" });
    expect(screen.queryByText("Volcano")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(screen.getByRole("heading", { name: "Pass to Player 1" })).toBeInTheDocument();
    expect(screen.queryByText("Volcano")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reveal my role" }));
    expect(screen.getByText("Volcano")).toBeInTheDocument();
    act(() => {
      device.activity?.(false);
    });
    expect(screen.queryByText("Volcano")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Game covered" })).toBeInTheDocument();
    act(() => {
      device.activity?.(true);
    });
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.queryByText("Volcano")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pass to Player 1" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reveal my role" }));
    expect(screen.getByText("Volcano")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("rvlry:back", { cancelable: true }));
    });
    expect(screen.queryByText("Volcano")).not.toBeInTheDocument();
  });

  it("requires confirmation to replace the saved round and keeps it on cancellation", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(await screen.findByRole("button", { name: "Start new game" }));
    expect(screen.getByRole("heading", { name: "Start a new game?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep current game" }));
    expect(screen.getByRole("heading", { name: "Your saved game" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume" }));
    await user.click(screen.getByRole("button", { name: "Reveal my role" }));
    expect(screen.getByText("Volcano")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hide role and pass phone" }));
    expect(screen.queryByText("Volcano")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pass to Player 2" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reveal my role" }));
    expect(screen.getByRole("heading", { name: "You are the imposter" })).toBeInTheDocument();
    expect(screen.queryByText("Volcano")).not.toBeInTheDocument();
  });
});
