import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { HatGameSession } from "@/domain/hat-game/types";
import { HatActiveTurnPanel } from "@/features/hat-game/HatActiveTurnPanel";

function buildTurnSession(): HatGameSession {
  return {
    players: [{ id: "player-1", name: "Ada", seat: 0, teamId: "team-1" }],
    teams: [{ id: "team-1", name: "Red Team", score: 4 }],
    settings: {
      cluesPerPlayer: 6,
      skipsPerTurn: 3,
      teamCount: 2,
      turnDurationSeconds: 60,
    },
    stage: "turn",
    roundNumber: 1,
    phaseNumber: 1,
    teamOrder: ["team-1"],
    teamIndex: 0,
    describerIndexes: { "team-1": 0 },
    cluePool: [],
    usedCluePoolIndices: [],
    activeTurn: {
      startedAt: "2026-05-14T00:00:00.000Z",
      endsAt: "2026-05-14T00:01:00.000Z",
      durationSeconds: 60,
      clueQueue: [
        {
          poolIndex: 12,
          submittedBy: "player-1",
          submittedByName: "Ada",
          text: "Grace Hopper",
        },
      ],
      queueIndex: 0,
      score: 2,
      correctCount: 2,
      skippedCount: 1,
      skipsRemaining: 2,
      skippedClues: [{ poolIndex: 7, text: "Katherine Johnson" }],
      currentSkippedCluePoolIndex: null,
      clueHistory: [],
    },
    lastTurnSummary: null,
    bestTurnSummary: null,
    results: null,
  };
}

describe("HatActiveTurnPanel", () => {
  it("renders the shared active-turn metrics and optional phase metric", () => {
    render(
      <HatActiveTurnPanel
        onReturnSkipped={() => {}}
        secondsRemaining={65}
        session={buildTurnSession()}
        showPhaseMetric
      />,
    );

    expect(screen.getByText("Red Team guessing")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("1:05")).toBeInTheDocument();
    expect(screen.getByText("Describe")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("calls back with the skipped clue pool index", async () => {
    const user = userEvent.setup();
    const onReturnSkipped = vi.fn();

    render(
      <HatActiveTurnPanel
        onReturnSkipped={onReturnSkipped}
        secondsRemaining={20}
        session={buildTurnSession()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Katherine Johnson/ }));

    expect(onReturnSkipped).toHaveBeenCalledWith(7);
  });
});
