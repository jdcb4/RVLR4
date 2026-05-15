import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ImposterMultiplayerBody } from "@/features/imposter/multiplayer/ImposterMultiplayerBody";
import { ImposterMultiplayerFooter } from "@/features/imposter/multiplayer/ImposterMultiplayerFooter";
import { getParallelRevealProgress } from "@/features/imposter/multiplayer/imposterMultiplayerReveal";
import type { ImposterSyncDto } from "@/multiplayer/roomTypes";

const basePayload: ImposterSyncDto = {
  revealSubjectId: "viewer",
  revealSubjectIsImposter: false,
  snapshot: {
    step: "reveal",
    playerCount: 2,
    imposterCount: 1,
    cluesStartPlayerId: null,
    players: [
      { id: "viewer", name: "Viewer" },
      { id: "other", name: "Other" },
    ],
    round: {
      secretWord: "orchard",
      imposterPlayerIds: ["other"],
      revealPlayerIndex: 0,
      revealRevealed: false,
      parallelRoleSeen: {
        viewer: false,
      },
      parallelRevealDone: {
        viewer: false,
      },
    },
  },
};

function withParallelProgress({
  seen,
  done,
}: {
  readonly seen: boolean;
  readonly done: boolean;
}): ImposterSyncDto {
  return {
    ...basePayload,
    snapshot: {
      ...basePayload.snapshot,
      round: {
        ...basePayload.snapshot.round!,
        parallelRoleSeen: {
          viewer: seen,
        },
        parallelRevealDone: {
          viewer: done,
        },
      },
    },
  };
}

describe("Imposter multiplayer reveal primitives", () => {
  it("derives parallel reveal progress for the current viewer", () => {
    expect(getParallelRevealProgress(basePayload.snapshot.round!, "viewer")).toEqual({
      seen: false,
      done: false,
    });
  });

  it("renders the private prompt before the viewer has seen their role", () => {
    render(
      <ImposterMultiplayerBody
        error=""
        isHost={false}
        payload={withParallelProgress({ seen: false, done: false })}
        viewerPlayerId="viewer"
      />,
    );

    expect(screen.getByRole("heading", { name: "Reveal - Viewer" })).toBeInTheDocument();
    expect(screen.getByText(/Only you should look at your phone/)).toBeInTheDocument();
  });

  it("renders the secret word once the viewer has revealed their role", () => {
    render(
      <ImposterMultiplayerBody
        error=""
        isHost={false}
        payload={withParallelProgress({ seen: true, done: false })}
        viewerPlayerId="viewer"
      />,
    );

    expect(screen.getByText("orchard")).toBeInTheDocument();
    expect(screen.getByText(/tap/i)).toBeInTheDocument();
  });

  it("dispatches the parallel reveal continuation from the footer", async () => {
    const user = userEvent.setup();
    const onDispatch = vi.fn(async () => undefined);

    render(
      <ImposterMultiplayerFooter
        busy={false}
        emitWithAck={vi.fn(async () => ({ ok: true }))}
        isHost={false}
        payload={withParallelProgress({ seen: true, done: false })}
        replaySync={{
          offerActive: false,
          acceptedIds: [],
          cancelledByDisconnect: false,
        }}
        viewerPlayerId="viewer"
        onDispatch={onDispatch}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onDispatch).toHaveBeenCalledWith({ type: "reveal-confirm-next" });
  });
});
