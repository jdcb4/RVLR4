import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createMatch } from "@/domain/whowhatwhere/game";
import { createDefaultSettings } from "@/domain/whowhatwhere/setup";
import type { LastTurnSummary, MatchState } from "@/domain/whowhatwhere/types";
import {
  WhoWhatWhereDeviceRecap,
  WhoWhatWhereDeviceResults,
} from "@/features/whowhatwhere/results/WhoWhatWhereDeviceResults";
import { WhoWhatWhereDeviceTeamSetup } from "@/features/whowhatwhere/setup/WhoWhatWhereDeviceSetup";
import type { WhoWhatWhereSingleplayerController } from "@/features/whowhatwhere/useWhoWhatWhereSingleplayerApp";
import { WhoWhatWhereDeviceProgress } from "@/features/whowhatwhere/WhoWhatWhereDeviceProgress";
import {
  WhoWhatWhereFooter,
  WhoWhatWhereModeContent,
} from "@/features/whowhatwhere/WhoWhatWhereSingleplayerChrome";

const teams = [
  {
    id: "team-1",
    name: "Foxes",
    players: [
      { id: "alex", name: "Alex" },
      { id: "jo", name: "Jo" },
    ],
  },
  {
    id: "team-2",
    name: "Otters",
    players: [
      { id: "maya", name: "Maya" },
      { id: "sam", name: "Sam" },
    ],
  },
];
const baseMatch = createMatch(teams, createDefaultSettings());
function summary(overrides: Partial<LastTurnSummary> = {}): LastTurnSummary {
  return {
    teamId: "team-1",
    teamName: "Foxes",
    describerId: "alex",
    describerName: "Alex",
    scoreDelta: 4,
    correctCount: 4,
    skippedCount: 2,
    pendingSkippedCount: 0,
    wordHistory: [],
    finalWord: null,
    ...overrides,
  };
}
function controller(
  overrides: Partial<WhoWhatWhereSingleplayerController> = {},
): WhoWhatWhereSingleplayerController {
  return {
    loaded: true,
    settings: baseMatch.settings,
    teamSetups: teams,
    activeMode: "ready",
    savedGameAvailable: false,
    presentationStage: null,
    match: baseMatch,
    pendingMatch: null,
    confirmDiscardPending: false,
    setupError: "",
    turnError: "",
    ...overrides,
  } as unknown as WhoWhatWhereSingleplayerController;
}

describe("device turn flow", () => {
  it("starts directly from the named presenter's confirmation", async () => {
    const user = userEvent.setup();
    const start = vi.fn();
    render(
      <WhoWhatWhereFooter
        game={controller({ startNextTurn: start })}
        onPickAnotherGame={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "I’m Alex, start turn" }));
    expect(start).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Start turn" })).not.toBeInTheDocument();
  });

  it("shows the completed round and identity after the engine advances", () => {
    const last = summary({
      teamId: "team-2",
      teamName: "Otters",
      describerId: "maya",
      describerName: "Maya",
    });
    const match: MatchState = {
      ...baseMatch,
      roundNumber: 2,
      teamIndex: 0,
      turnSummaries: [summary(), last],
      lastTurnSummary: last,
    };
    render(<WhoWhatWhereDeviceRecap match={match} />);
    expect(screen.getByRole("heading", { name: "Otters scored 4." })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Round 1 of 2, team progress" })).toBeInTheDocument();
    expect(screen.getAllByText("Complete")).toHaveLength(2);
    expect(screen.queryByText(/Now ·/)).not.toBeInTheDocument();
  });

  it("keeps every word action and the unplayed clue in the recap", () => {
    const word = { word: "Lighthouse", category: "What" as const, hint: "" };
    const last = summary({
      wordHistory: [
        { word, status: "skipped", source: "main", timestamp: "2026-10-21T01:00:00.000Z" },
        { word, status: "correct", source: "skipped", timestamp: "2026-10-21T01:00:01.000Z" },
      ],
      finalWord: { ...word, word: "Compass" },
    });
    render(
      <WhoWhatWhereDeviceRecap
        match={{ ...baseMatch, turnSummaries: [last], lastTurnSummary: last }}
      />,
    );
    const list = screen.getByRole("list", { name: "Turn words" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).getByText("Skipped")).toBeInTheDocument();
    expect(within(list).getByText("Correct")).toBeInTheDocument();
    expect(within(list).getByText("Unplayed")).toBeInTheDocument();
  });

  it("keeps progress informational and numbers every team", () => {
    render(<WhoWhatWhereDeviceProgress match={baseMatch} />);
    expect(screen.getByText("Foxes")).toBeInTheDocument();
    expect(screen.getByText("Otters")).toBeInTheDocument();
    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("makes a recap a distinct step before the next handoff", async () => {
    const user = userEvent.setup();
    const advance = vi.fn();
    render(
      <WhoWhatWhereFooter
        game={controller({
          match: { ...baseMatch, teamIndex: 1 },
          presentationStage: "recap",
          advanceTurnRecap: advance,
        })}
        onPickAnotherGame={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Start turn" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pass phone to Maya" }));
    expect(advance).toHaveBeenCalledOnce();
  });

  it("places end-turn in pause options and uses the paused action", async () => {
    const user = userEvent.setup();
    const endPausedTurn = vi.fn();
    render(
      <WhoWhatWhereFooter
        game={controller({ paused: true, match: { ...baseMatch, stage: "turn" }, endPausedTurn })}
        onPickAnotherGame={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "End turn" }));
    expect(endPausedTurn).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Start new game" })).toBeInTheDocument();
  });

  it("offers dated saved-game choices before the paused screen", () => {
    const game = controller({
      savedGameAvailable: true,
      paused: true,
      savedAt: "2026-10-21T01:00:00.000Z",
    });
    render(
      <>
        <WhoWhatWhereModeContent game={game} />
        <WhoWhatWhereFooter game={game} onPickAnotherGame={vi.fn()} />
      </>,
    );
    expect(screen.getByRole("heading", { name: "Saved game" })).toBeInTheDocument();
    expect(screen.getByText(/21/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume game" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start new game" })).toBeInTheDocument();
    expect(screen.queryByText("Take your time.")).not.toBeInTheDocument();
  });

  it("labels a saved recap with the completed presenter and round", () => {
    const last = summary({
      teamId: "team-2",
      teamName: "Otters",
      describerId: "maya",
      describerName: "Maya",
    });
    const game = controller({
      savedGameAvailable: true,
      presentationStage: "recap",
      match: {
        ...baseMatch,
        roundNumber: 2,
        teamIndex: 0,
        turnSummaries: [summary(), last],
        lastTurnSummary: last,
      },
    });
    const { rerender } = render(<WhoWhatWhereModeContent game={game} />);
    expect(screen.getByText("Maya · Otters")).toBeInTheDocument();
    expect(screen.getByText("Round 1 of 2 · Turn recap")).toBeInTheDocument();
    rerender(
      <WhoWhatWhereModeContent game={{ ...game, savedGameAvailable: false, paused: true }} />,
    );
    expect(screen.getByText("Maya · Otters")).toBeInTheDocument();
    expect(screen.queryByText("Alex · Foxes")).not.toBeInTheDocument();
  });
});

describe("device results highlights", () => {
  it("includes every tied best turn and totals skip actions across each player's turns", () => {
    const turns = [
      summary({ skippedCount: 3 }),
      summary({
        teamId: "team-2",
        teamName: "Otters",
        describerId: "maya",
        describerName: "Maya",
        skippedCount: 6,
      }),
      summary({ scoreDelta: 1, skippedCount: 3 }),
    ];
    render(
      <WhoWhatWhereDeviceResults
        match={{ ...baseMatch, turnSummaries: turns, stage: "results" }}
      />,
    );
    const best = screen.getByRole("region", { name: "Best turn" });
    expect(within(best).getByRole("heading", { name: "Best turn · 4 points" })).toBeInTheDocument();
    expect(within(best).getByText("Alex · Foxes")).toBeInTheDocument();
    expect(within(best).getByText("Maya · Otters")).toBeInTheDocument();
    const skips = screen.getByRole("region", { name: "Most skips" });
    expect(within(skips).getByRole("heading", { name: "Most skips · 6" })).toBeInTheDocument();
    expect(within(skips).getByText("Alex · Foxes")).toBeInTheDocument();
    expect(within(skips).getByText("Maya · Otters")).toBeInTheDocument();
  });

  it("does not invent a skip leader for a game with no skips", () => {
    render(
      <WhoWhatWhereDeviceResults
        match={{ ...baseMatch, turnSummaries: [summary({ skippedCount: 0 })] }}
      />,
    );
    expect(
      within(screen.getByRole("region", { name: "Most skips" })).getByText("No skips."),
    ).toBeInTheDocument();
  });
});

describe("device team setup", () => {
  it("edits names directly and exposes presenter order", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(
      <WhoWhatWhereDeviceTeamSetup
        teams={teams}
        teamIndex={0}
        error=""
        onTeamsChange={change}
        onBack={vi.fn()}
      />,
    );
    const field = screen.getByRole("textbox", { name: "First presenter" });
    await user.type(field, "x");
    expect(change).toHaveBeenCalledWith([
      {
        ...teams[0],
        players: [
          { id: "alex", name: "Alexx" },
          { id: "jo", name: "Jo" },
        ],
      },
      teams[1],
    ]);
    expect(screen.getByRole("textbox", { name: "Presenter 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add player" })).toBeEnabled();
  });

  it("advances the keyboard between names and dismisses it after the final presenter", async () => {
    const user = userEvent.setup();
    render(
      <WhoWhatWhereDeviceTeamSetup
        teams={teams}
        teamIndex={0}
        error=""
        onTeamsChange={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("textbox", { name: "Team name" }));
    await user.keyboard("{Enter}");
    expect(screen.getByRole("textbox", { name: "First presenter" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("textbox", { name: "Presenter 2" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("textbox", { name: "Presenter 2" })).not.toHaveFocus();
  });
});
