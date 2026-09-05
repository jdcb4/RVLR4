import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DrawNGuessSyncDto } from "@/domain/drawnguess/types";
import { playGameSoundEffect } from "@/services/gameSoundEffects";

import { DrawNGuessMultiplayerView } from "./DrawNGuessMultiplayerView";

vi.mock("@/services/gameSoundEffects", () => ({
  playGameSoundEffect: vi.fn(async () => undefined),
}));

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

const drawingTurnPayload: DrawNGuessSyncDto = {
  public: {
    ...completePayload.public,
    phase: "turn",
    turnIndex: 0,
    turnMode: "drawing",
    startedAt: 1_000,
    deadlineAt: 12_000,
    submittedPlayerIds: ["host"],
  },
  private: {
    assignment: {
      mode: "drawing",
      packetId: "packet-host",
      starterPlayerId: "host",
      promptText: "Lighthouse",
    },
    hasSubmitted: true,
    ownSubmission: {
      playerId: "host",
      status: "submitted",
      updatedAt: 1_000,
      submittedAt: 1_000,
      drawing: { format: "placeholder-v1", text: "No response submitted" },
    },
  },
};

const guessingTurnPayload: DrawNGuessSyncDto = {
  public: {
    ...drawingTurnPayload.public,
    turnIndex: 1,
    turnMode: "guessing",
    startedAt: 21_000,
    deadlineAt: 32_000,
  },
  private: {
    assignment: {
      mode: "guessing",
      packetId: "packet-guest",
      starterPlayerId: "guest",
      drawing: { format: "placeholder-v1", text: "No response submitted" },
    },
    hasSubmitted: false,
    ownSubmission: null,
  },
};

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(playGameSoundEffect).mockClear();
});

describe("DrawNGuessMultiplayerView", () => {
  it("submits a text response with Enter and exposes mobile keyboard hints", async () => {
    const user = userEvent.setup();
    const emitWithAck = vi.fn(async () => ({ ok: true }));
    const now = Date.now();
    const payload: DrawNGuessSyncDto = {
      public: {
        ...guessingTurnPayload.public,
        startedAt: now,
        deadlineAt: now + 60_000,
      },
      private: {
        ...guessingTurnPayload.private,
        ownSubmission: {
          playerId: "host",
          status: "draft",
          updatedAt: now,
          guessText: "Robot chef",
        },
      },
    };

    render(
      <MemoryRouter>
        <DrawNGuessMultiplayerView
          emitWithAck={emitWithAck}
          isHost
          payload={payload}
          replaySync={{ offerActive: false, acceptedIds: [], cancelledByDisconnect: false }}
          viewerPlayerId="host"
        />
      </MemoryRouter>,
    );

    const input = await screen.findByPlaceholderText("Your guess");
    await waitFor(() => expect(input).toHaveValue("Robot chef"));
    expect(input).toHaveAttribute("enterkeyhint", "send");
    expect(input).toHaveAttribute("autocapitalize", "sentences");
    expect(input).toHaveAttribute("spellcheck", "false");

    await user.click(input);
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(emitWithAck).toHaveBeenCalledWith("drawnguess:submitGuess", {
        text: "Robot chef",
        turnKey: `1:guessing:${now + 60_000}`,
      }),
    );
  });

  it.each(["guessing", "custom-prompt"] as const)(
    "preserves a %s edit across peer broadcasts and delayed acknowledgements",
    async (mode) => {
      const now = Date.now();
      const field = mode === "guessing" ? "guessText" : "promptText";
      const payload: DrawNGuessSyncDto = {
        public: { ...guessingTurnPayload.public, turnMode: mode, deadlineAt: now + 60_000 },
        private: {
          ...guessingTurnPayload.private,
          assignment:
            mode === "guessing"
              ? guessingTurnPayload.private.assignment
              : { mode, packetId: "packet-host", starterPlayerId: "host" },
          hasSubmitted: true,
          ownSubmission: {
            playerId: "host",
            status: "submitted",
            updatedAt: now,
            [field]: "Robot",
          },
        },
      };
      const replies: ((ack: { ok: boolean; error?: string }) => void)[] = [];
      const emitWithAck = vi.fn(
        () => new Promise<{ ok: boolean; error?: string }>((resolve) => replies.push(resolve)),
      );
      const view = (next: DrawNGuessSyncDto) => (
        <MemoryRouter>
          <DrawNGuessMultiplayerView
            payload={next}
            emitWithAck={emitWithAck}
            isHost
            viewerPlayerId="host"
            replaySync={{ offerActive: false, acceptedIds: [], cancelledByDisconnect: false }}
          />
        </MemoryRouter>
      );
      const { rerender } = render(view(payload));
      fireEvent.click(screen.getByRole("button", { name: "Edit response" }));
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Robot " } });
      rerender(
        view({
          ...payload,
          private: {
            ...payload.private,
            ownSubmission: { ...payload.private.ownSubmission!, [field]: "Robot" },
          },
        }),
      );
      expect(screen.getByRole("textbox")).toHaveValue("Robot ");
      fireEvent.change(input, { target: { value: "Robot chef" } });
      await act(async () => {
        replies[0]!({ ok: false, error: "Stale failure" });
      });
      expect(screen.getByRole("textbox")).toHaveValue("Robot chef");
      expect(screen.queryByText("Stale failure")).not.toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", {
          name: mode === "guessing" ? "Update guess" : "Update prompt",
        }),
      );
      expect(input).toBeDisabled();
      await act(async () => {
        await Promise.resolve();
        replies[1]!({ ok: true });
      });
      expect(screen.getByText("Response submitted")).toBeInTheDocument();
      rerender(
        view({
          ...payload,
          public: { ...payload.public, deadlineAt: now + 90_000 },
          private: { ...payload.private, hasSubmitted: false, ownSubmission: null },
        }),
      );
      expect(screen.getByRole("textbox")).toHaveValue("");
    },
  );

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
    expect(emitWithAck).not.toHaveBeenCalledWith("drawnguess:openRevealPacket", expect.anything());
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
    expect(emitWithAck).not.toHaveBeenCalledWith("drawnguess:advanceReveal", expect.anything());
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

  it("plays the shared 10-second warning cue once during drawing and guessing turns", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    const view = render(
      <MemoryRouter>
        <DrawNGuessMultiplayerView
          emitWithAck={vi.fn(async () => ({ ok: true }))}
          isHost
          payload={drawingTurnPayload}
          replaySync={{
            offerActive: false,
            acceptedIds: [],
            cancelledByDisconnect: false,
          }}
          viewerPlayerId="host"
        />
      </MemoryRouter>,
    );

    expect(playGameSoundEffect).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });

    expect(playGameSoundEffect).toHaveBeenCalledTimes(1);
    expect(playGameSoundEffect).toHaveBeenCalledWith("warn10");

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });

    expect(playGameSoundEffect).toHaveBeenCalledTimes(1);

    vi.setSystemTime(21_000);
    view.rerender(
      <MemoryRouter>
        <DrawNGuessMultiplayerView
          emitWithAck={vi.fn(async () => ({ ok: true }))}
          isHost
          payload={guessingTurnPayload}
          replaySync={{
            offerActive: false,
            acceptedIds: [],
            cancelledByDisconnect: false,
          }}
          viewerPlayerId="host"
        />
      </MemoryRouter>,
    );

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });

    expect(playGameSoundEffect).toHaveBeenCalledTimes(2);
    expect(playGameSoundEffect).toHaveBeenLastCalledWith("warn10");
  });
});
