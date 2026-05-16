import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { DrawNGuessSyncDto } from "@/domain/drawnguess/types";

import { DrawNGuessMultiplayerView } from "./DrawNGuessMultiplayerView";

const completePayload: DrawNGuessSyncDto = {
  public: {
    phase: "complete",
    settings: {
      startingPromptMode: "predetermined",
      wordPackId: "easy-all",
      drawingDurationMs: 60_000,
      guessDurationMs: 30_000,
      customPromptDurationMs: 30_000,
      autoSubmitGraceMs: 1_500,
    },
    roster: [
      { id: "host", name: "Host", avatarId: "bear" },
      { id: "guest", name: "Guest", avatarId: "cat" },
    ],
    turnIndex: 2,
    turnMode: null,
    startedAt: null,
    deadlineAt: null,
    submittedPlayerIds: [],
    revealPacketIndex: 0,
    revealEntryIndex: 0,
    packets: [
      {
        id: "packet-host",
        starterPlayerId: "host",
        entries: [
          { type: "prompt", playerId: "deck", text: "Lighthouse", createdAt: 1 },
          {
            type: "drawing",
            playerId: "guest",
            drawing: { format: "placeholder-v1", text: "No response submitted" },
            createdAt: 2,
          },
          { type: "guess", playerId: "host", text: "Beach tower", createdAt: 3 },
        ],
      },
      {
        id: "packet-guest",
        starterPlayerId: "guest",
        entries: [
          { type: "prompt", playerId: "deck", text: "Pizza", createdAt: 4 },
          { type: "guess", playerId: "host", text: "Dinner", createdAt: 5 },
        ],
      },
    ],
  },
  private: {
    assignment: null,
    hasSubmitted: false,
    ownSubmission: null,
  },
};

const revealPayload: DrawNGuessSyncDto = {
  public: {
    ...completePayload.public,
    phase: "reveal",
    revealPacket: completePayload.public.packets![0]!,
    packets: completePayload.public.packets!,
  },
  private: completePayload.private,
};

describe("DrawNGuessMultiplayerView", () => {
  it("opens final gallery packets locally without dispatching a room reveal event", async () => {
    const user = userEvent.setup();
    const emitWithAck = vi.fn(async () => ({ ok: true }));

    render(
      <MemoryRouter>
        <DrawNGuessMultiplayerView
          emitWithAck={emitWithAck}
          isHost
          payload={completePayload}
          replaySync={{
            offerActive: false,
            acceptedIds: [],
            cancelledByDisconnect: false,
          }}
          viewerPlayerId="host"
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /Host's book/i }));
    await user.click(screen.getByRole("button", { name: /Next page/i }));
    await user.click(screen.getByRole("button", { name: /Next page/i }));

    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
    expect(screen.getByText("Beach tower")).toBeInTheDocument();
    expect(emitWithAck).not.toHaveBeenCalledWith(
      "drawnguess:openRevealPacket",
      expect.anything(),
    );
  });

  it("shows each player only their own presentation book with local page controls", async () => {
    const user = userEvent.setup();
    const emitWithAck = vi.fn(async () => ({ ok: true }));

    render(
      <MemoryRouter>
        <DrawNGuessMultiplayerView
          emitWithAck={emitWithAck}
          isHost={false}
          payload={revealPayload}
          replaySync={{
            offerActive: false,
            acceptedIds: [],
            cancelledByDisconnect: false,
          }}
          viewerPlayerId="guest"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Guest's book")).toBeInTheDocument();
    expect(screen.queryByText("Host's book")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Next page/i }));

    expect(screen.getByText("Dinner")).toBeInTheDocument();
    expect(emitWithAck).not.toHaveBeenCalledWith(
      "drawnguess:advanceReveal",
      expect.anything(),
    );
  });

  it("lets a player move locally from presentation to the final gallery", async () => {
    const user = userEvent.setup();
    const emitWithAck = vi.fn(async () => ({ ok: true }));

    render(
      <MemoryRouter>
        <DrawNGuessMultiplayerView
          emitWithAck={emitWithAck}
          isHost
          payload={revealPayload}
          replaySync={{
            offerActive: false,
            acceptedIds: [],
            cancelledByDisconnect: false,
          }}
          viewerPlayerId="host"
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /Go to Final Gallery/i }));

    expect(screen.getByText("Final gallery")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Guest's book/i })).toBeInTheDocument();
  });
});
