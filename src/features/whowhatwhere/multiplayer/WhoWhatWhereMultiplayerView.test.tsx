import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createDefaultSettings } from "@/domain/whowhatwhere/setup";
import type { MatchState } from "@/domain/whowhatwhere/types";
import { GuessOrObserveTurn } from "@/features/whowhatwhere/multiplayer/WhoWhatWhereMultiplayerBody";
import { WhoWhatWhereMultiplayerFooter } from "@/features/whowhatwhere/multiplayer/WhoWhatWhereMultiplayerFooter";

function buildMatch(overrides: Partial<MatchState> = {}): MatchState {
  return {
    gameId: "whowhatwhere",
    players: [
      { id: "describer", name: "Ada", seat: 0, teamId: "red" },
      { id: "guesser", name: "Grace", seat: 1, teamId: "red" },
      { id: "bench", name: "Linus", seat: 2, teamId: "blue" },
    ],
    teams: [
      { id: "red", name: "Red Team", score: 6 },
      { id: "blue", name: "Blue Team", score: 4 },
    ],
    settings: createDefaultSettings(),
    stage: "ready",
    roundNumber: 1,
    teamOrder: ["red", "blue"],
    teamIndex: 0,
    describerIndexes: { red: 0, blue: 0 },
    activeTurn: null,
    lastTurnSummary: null,
    turnSummaries: [],
    results: null,
    wordReserves: {},
    ...overrides,
  };
}

describe("Who What Where multiplayer primitives", () => {
  it("dispatches the start-turn event from the extracted ready footer", async () => {
    const user = userEvent.setup();
    const emitWithAck = vi.fn(async () => ({ ok: true }));

    render(
      <WhoWhatWhereMultiplayerFooter
        busy={false}
        emitWithAck={emitWithAck}
        isHost={false}
        match={buildMatch()}
        replaySync={{
          offerActive: false,
          acceptedIds: [],
          cancelledByDisconnect: false,
        }}
        role="describer"
        setBusy={() => {}}
        setError={() => {}}
        showScoresPane={false}
        showTurnFooter={false}
        viewerPlayerId="describer"
        onShowScoresPane={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Start turn" }));

    expect(emitWithAck).toHaveBeenCalledWith("www:startTurn");
  });

  it("renders the passive turn snapshot for guessers", () => {
    const match = buildMatch({
      stage: "turn",
      activeTurn: {
        startedAt: "2026-05-15T00:00:00.000Z",
        endsAt: "2099-05-15T00:01:00.000Z",
        durationSeconds: 60,
        category: "Where",
        wordQueue: [],
        queueIndex: 0,
        currentWordSource: "main",
        currentSkippedWord: null,
        score: 3,
        correctCount: 3,
        skippedCount: 0,
        skipLimit: 3,
        skippedWords: [],
        nextSkippedWordId: 1,
        wordHistory: [],
        hintsRemaining: 1,
        currentWordHintRevealed: false,
      },
    });

    render(<GuessOrObserveTurn match={match} role="guesser" />);

    expect(screen.getByText("Guess with your team")).toBeInTheDocument();
    expect(screen.getByText("Turn snapshot")).toBeInTheDocument();
    expect(screen.getByText("Where")).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Red Team")).toBeInTheDocument();
    expect(screen.getByText("Blue Team")).toBeInTheDocument();
  });
});
