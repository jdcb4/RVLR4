import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { HatGameSession } from "@/domain/hat-game/types";
import type { HatSyncDto } from "@/domain/multiplayer/protocol";
import { HatMultiplayerBody } from "@/features/hat-game/multiplayer/HatMultiplayerBody";
import { HatMultiplayerFooter } from "@/features/hat-game/multiplayer/HatMultiplayerFooter";
import { HatMultiplayerView } from "@/features/hat-game/multiplayer/HatMultiplayerView";

afterEach(() => vi.useRealTimers());

function buildSession(overrides: Partial<HatGameSession> = {}): HatGameSession {
  return {
    players: [
      { id: "describer", name: "Ada", seat: 0, teamId: "red" },
      { id: "guesser", name: "Grace", seat: 1, teamId: "red" },
      { id: "bench", name: "Linus", seat: 2, teamId: "blue" },
    ],
    teams: [
      { id: "red", name: "Red Team", score: 4 },
      { id: "blue", name: "Blue Team", score: 2 },
    ],
    settings: {
      cluesPerPlayer: 6,
      skipsPerTurn: 3,
      teamCount: 2,
      turnDurationSeconds: 60,
    },
    stage: "ready",
    roundNumber: 1,
    phaseNumber: 1,
    teamOrder: ["red", "blue"],
    teamIndex: 0,
    describerIndexes: { red: 0, blue: 0 },
    cluePool: [],
    usedCluePoolIndices: [],
    activeTurn: null,
    lastTurnSummary: null,
    bestTurnSummary: null,
    results: null,
    ...overrides,
  };
}

function buildPayload(overrides: Partial<HatSyncDto> = {}): HatSyncDto {
  return {
    session: buildSession(),
    role: "describer",
    readyReveal: false,
    showTurnFooter: false,
    canReturnSkipped: false,
    ...overrides,
  };
}

describe("Hat multiplayer primitives", () => {
  it("does not announce expiry when a new timed turn arrives", () => {
    vi.useFakeTimers();
    const view = (session: HatGameSession) => (
      <MemoryRouter>
        <HatMultiplayerView
          payload={buildPayload({ session, role: "guesser" })}
          emitWithAck={vi.fn(async () => ({ ok: true }))}
          viewerPlayerId="guesser"
          isHost={false}
          replaySync={{ offerActive: false, acceptedIds: [], cancelledByDisconnect: false }}
        />
      </MemoryRouter>
    );
    const { rerender } = render(view(buildSession()));
    rerender(
      view(
        buildSession({
          stage: "turn",
          activeTurn: {
            startedAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 45_000).toISOString(),
            durationSeconds: 45,
            clueQueue: [],
            queueIndex: 0,
            score: 0,
            correctCount: 0,
            skippedCount: 0,
            skipsRemaining: 1,
            skippedClues: [],
            currentSkippedCluePoolIndex: null,
            clueHistory: [],
          },
        }),
      ),
    );
    expect(screen.getByText("0:45")).toBeInTheDocument();
    expect(screen.queryByText("Time is up.")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(35_000));
    expect(screen.getByText("10 seconds remaining.")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByText("Time is up.")).toBeInTheDocument();
  });
  it("dispatches the start-turn event from the extracted ready footer", async () => {
    const user = userEvent.setup();
    const emitWithAck = vi.fn(async () => ({ ok: true }));

    render(
      <HatMultiplayerFooter
        busy={false}
        emitWithAck={emitWithAck}
        isHost={false}
        payload={buildPayload()}
        replaySync={{
          offerActive: false,
          acceptedIds: [],
          cancelledByDisconnect: false,
        }}
        session={buildSession()}
        setBusy={() => {}}
        setError={() => {}}
        showScoresPane={false}
        viewerPlayerId="describer"
        onShowScoresPane={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start turn" }));

    expect(emitWithAck).toHaveBeenCalledWith("hat:startTurn");
  });

  it("renders the passive turn snapshot for guessers", () => {
    const session = buildSession({
      stage: "turn",
      activeTurn: {
        startedAt: "2026-05-15T00:00:00.000Z",
        endsAt: "2026-05-15T00:01:00.000Z",
        durationSeconds: 60,
        clueQueue: [],
        queueIndex: 0,
        score: 3,
        correctCount: 3,
        skippedCount: 0,
        skipsRemaining: 2,
        skippedClues: [],
        currentSkippedCluePoolIndex: null,
        clueHistory: [],
      },
    });

    render(
      <HatMultiplayerBody
        busy={false}
        emitWithAck={vi.fn(async () => ({ ok: true }))}
        error=""
        payload={buildPayload({
          role: "guesser",
          session,
          showTurnFooter: false,
        })}
        secondsLeft={42}
        session={session}
        setBusy={() => {}}
        setError={() => {}}
        showScoresPane={false}
        viewerPlayerId="guesser"
      />,
    );

    expect(screen.getByText("Guess with your team")).toBeInTheDocument();
    expect(screen.getByText("Turn snapshot")).toBeInTheDocument();
    expect(screen.getByText("0:42")).toBeInTheDocument();
    expect(screen.getByText("Red Team")).toBeInTheDocument();
    expect(screen.getByText("Blue Team")).toBeInTheDocument();
  });
});
