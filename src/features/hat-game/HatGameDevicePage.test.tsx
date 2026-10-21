import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyHatGameAction } from "@/domain/hat-game/engine";
import { buildDefaultSetup } from "@/domain/hat-game/setup";
import type { ClueHistoryEntry, HatGameAction, HatGameSession } from "@/domain/hat-game/types";
import { HatDeviceRecap, HatDeviceResults, HatDeviceTurn } from "@/features/hat-game/HatDevicePlay";
import {
  createHatDeviceSession,
  HAT_DEVICE_SESSION_KEY,
  hatDeviceSessionSchema,
} from "@/features/hat-game/hatDeviceSession";
import { HatGameDevicePage } from "@/features/hat-game/HatGameDevicePage";
import { startHatSession } from "@/features/hat-game/hatSingleplayerTransitions";
import { readSnapshot, writeSnapshot } from "@/services/nativeSnapshotStore";

vi.mock("@/services/deviceLifecycle", () => ({
  isDeviceActive: () => true,
  subscribeDeviceActivity: (listener: (active: boolean) => void) => {
    listener(true);
    return () => undefined;
  },
  setDevicePrivacy: vi.fn(async () => undefined),
  setDeviceKeepAwake: vi.fn(async () => undefined),
}));
vi.mock("@/services/gameSoundEffects", () => ({
  playGameSoundEffect: vi.fn(async () => undefined),
}));

function fixture() {
  const state = createHatDeviceSession();
  const { teams, players } = buildDefaultSetup(4, 2);
  const snapshot = {
    ...state.snapshot,
    teams,
    players,
    playerCount: players.length,
    clueSubmissions: Object.fromEntries(
      players.map((player, playerIndex) => [
        player.id,
        {
          clues: Array.from({ length: 6 }, (_, index) => `Private figure ${playerIndex}-${index}`),
        },
      ]),
    ),
  };
  return { ...state, snapshot: startHatSession(snapshot, snapshot) };
}
function page() {
  return render(
    <MemoryRouter initialEntries={["/games/hat"]}>
      <Routes>
        <Route path="/games/hat" element={<HatGameDevicePage />} />
        <Route path="/passnplay" element={<p>Game picker</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function apply(match: HatGameSession, action: HatGameAction, expired = false) {
  const result = applyHatGameAction(match, action, { isPast: () => expired });
  if ("error" in result) throw new Error(result.error);
  return result;
}

describe("Hat device phone flow", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps private drafts behind handoff after leaving, with Next and Done keyboard behavior", async () => {
    const user = userEvent.setup();
    const mounted = page();
    await screen.findByRole("heading", { name: "Game settings" });
    await user.click(screen.getByRole("button", { name: "Next: Team 1" }));
    await screen.findByRole("heading", { name: "Team 1 of 2" });
    const first = screen.getByRole("textbox", { name: "First presenter" });
    await user.clear(first);
    await user.type(first, "Alex");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("textbox", { name: "Presenter 2" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Save team" }));
    await screen.findByRole("heading", { name: "Team 2 of 2" });
    await user.click(screen.getByRole("button", { name: "Save team" }));
    await screen.findByRole("heading", { name: "Review teams" });
    await user.click(screen.getByRole("button", { name: "Enter private figures" }));
    await screen.findByRole("heading", { name: "Pass to Alex." });
    expect(screen.queryByRole("textbox", { name: "Famous figure 1" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "I’m Alex" }));
    const clue = await screen.findByRole("textbox", { name: "Famous figure 1" });
    await waitFor(() => expect(clue).toBeEnabled());
    await user.type(clue, "Private unfinished figure{Enter}");
    expect(screen.getByRole("textbox", { name: "Famous figure 2" })).toHaveFocus();
    const last = screen.getByRole("textbox", { name: "Famous figure 6" });
    await user.click(last);
    await user.keyboard("{Enter}");
    expect(last).not.toHaveFocus();
    await user.click(screen.getByRole("link", { name: "Back to game picker" }));
    await screen.findByText("Game picker");
    mounted.unmount();
    page();
    await screen.findByRole("heading", { name: "Saved Hat Game" });
    expect(screen.queryByDisplayValue("Private unfinished figure")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume game" }));
    await screen.findByRole("heading", { name: "Pass to Alex." });
    expect(screen.queryByDisplayValue("Private unfinished figure")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "I’m Alex" }));
    await screen.findByDisplayValue("Private unfinished figure");
  });

  it("opens an active saved turn to a concealed summary before its explicit resume action", async () => {
    const user = userEvent.setup();
    const state = fixture();
    const result = applyHatGameAction(state.snapshot.session!, { type: "start-turn" });
    if ("error" in result) throw new Error(result.error);
    state.snapshot.session = result;
    state.remainingMs = 27_000;
    const clue = result.activeTurn!.clueQueue[0]!.text;
    await readSnapshot(HAT_DEVICE_SESSION_KEY, hatDeviceSessionSchema);
    await writeSnapshot(HAT_DEVICE_SESSION_KEY, state);
    page();
    await screen.findByRole("button", { name: "Resume game" });
    expect(screen.queryByText(clue)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume game" }));
    await screen.findByRole("heading", { name: "Take your time." });
    expect(screen.queryByText(clue)).not.toBeInTheDocument();
    expect(screen.getByText(/27 seconds remaining/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Resume .*’s turn$/ }));
    await screen.findByText(clue);
    expect(screen.getByRole("button", { name: "Correct" })).toBeEnabled();
  });

  it("shows a replay once in each phase without merging distinct figures with identical names", () => {
    const match = fixture().snapshot.session!;
    const history: ClueHistoryEntry[] = [
      {
        clue: "Same figure",
        poolIndex: 0,
        status: "skipped",
        phaseNumber: 1,
        timestamp: "2026-10-22T10:00:00Z",
      },
      {
        clue: "Same figure",
        poolIndex: 0,
        status: "correct",
        phaseNumber: 1,
        timestamp: "2026-10-22T10:00:01Z",
      },
      {
        clue: "Same figure",
        poolIndex: 0,
        status: "skipped",
        phaseNumber: 2,
        timestamp: "2026-10-22T10:00:02Z",
      },
      {
        clue: "Same figure",
        poolIndex: 1,
        status: "correct",
        phaseNumber: 2,
        timestamp: "2026-10-22T10:00:03Z",
      },
    ];
    render(
      <HatDeviceRecap
        match={{
          ...match,
          lastTurnSummary: {
            teamId: match.teams[0]!.id,
            teamName: "Foxes",
            describerId: null,
            describerName: "Alex",
            scoreDelta: 2,
            correctCount: 2,
            skippedCount: 2,
            clues: history,
            phaseCompleted: false,
            completedPhaseNumber: null,
            nextPhaseNumber: null,
            nextPhaseName: null,
          },
        }}
      />,
    );
    const list = within(screen.getByRole("list", { name: "Turn figures" }));
    expect(list.getAllByRole("listitem")).toHaveLength(3);
    expect(list.getAllByText("Correct")).toHaveLength(2);
    expect(list.getAllByText("Skipped")).toHaveLength(1);
    expect(list.getAllByRole("img", { name: "Replayed" })).toHaveLength(1);
  });

  it("keeps a selected skipped figure visible as in play and conceals uncommitted figures", () => {
    const match = fixture().snapshot.session!;
    const started = applyHatGameAction(match, { type: "start-turn" });
    if ("error" in started) throw new Error(started.error);
    const skipped = applyHatGameAction(started, { type: "skip-clue" });
    if ("error" in skipped) throw new Error(skipped.error);
    const result = applyHatGameAction(skipped, { type: "return-skipped-clue" });
    if ("error" in result) throw new Error(result.error);
    const clue = result.activeTurn!.clueQueue[result.activeTurn!.queueIndex]!.text;
    render(<HatDeviceTurn match={result} seconds={30} saving onReturnSkipped={vi.fn()} />);
    expect(screen.getByLabelText("Famous figure")).toHaveTextContent("Saving figure…");
    expect(screen.getByText("In play")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `${clue} In play` })).toBeDisabled();
  });

  it("distinguishes the unfinished timeout figure from correct guesses in the recap", () => {
    const started = apply(fixture().snapshot.session!, { type: "start-turn" });
    const guessed = started.activeTurn!.clueQueue[0]!.text;
    const scored = apply(started, { type: "mark-correct" });
    const unfinished = scored.activeTurn!.clueQueue[scored.activeTurn!.queueIndex]!.text;
    const ended = apply(scored, { type: "mark-correct" }, true);
    render(<HatDeviceRecap match={ended} />);
    const list = within(screen.getByRole("list", { name: "Turn figures" }));
    expect(list.getAllByRole("listitem")).toHaveLength(2);
    expect(list.getByText(guessed).closest("li")).toHaveTextContent("Correct");
    expect(list.getByText(unfinished).closest("li")).toHaveTextContent("Unplayed");
    expect(ended.lastTurnSummary?.scoreDelta).toBe(1);
  });

  it("merges an unfinished replay with its skipped row within the current phase", () => {
    let match = apply(fixture().snapshot.session!, { type: "start-turn" });
    const poolSize = match.cluePool.length;
    for (let index = 0; index < poolSize; index += 1)
      match = apply(match, { type: "mark-correct" });
    expect(match.phaseNumber).toBe(2);
    match = apply(match, { type: "skip-clue" });
    match = apply(match, { type: "return-skipped-clue" });
    const unfinished = match.activeTurn!.clueQueue[match.activeTurn!.queueIndex]!.text;
    match = apply(match, { type: "end-turn" });
    render(<HatDeviceRecap match={match} />);
    const list = within(screen.getByRole("list", { name: "Turn figures" }));
    expect(list.getAllByRole("listitem")).toHaveLength(poolSize + 1);
    expect(list.queryByText("Skipped")).not.toBeInTheDocument();
    expect(list.getAllByText("Unplayed")).toHaveLength(1);
    const rows = list.getAllByText(unfinished).map((element) => element.closest("li")!);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Describe");
    expect(rows[0]).toHaveTextContent("Correct");
    expect(rows[1]).toHaveTextContent("One Word");
    expect(rows[1]).toHaveTextContent("Unplayed");
  });

  it("omits an unfinished figure when the final Charades queue is exhausted", () => {
    let match = apply(fixture().snapshot.session!, { type: "start-turn" });
    const total = match.cluePool.length * 3;
    for (let index = 0; index < total; index += 1) match = apply(match, { type: "mark-correct" });
    expect(match.stage).toBe("finalSummary");
    expect(match.lastSeenCluePoolIndex).toBeNull();
    render(<HatDeviceRecap match={match} />);
    const list = within(screen.getByRole("list", { name: "Turn figures" }));
    expect(list.queryByText("Unplayed")).not.toBeInTheDocument();
    expect(list.getAllByText("Correct")).toHaveLength(total);
  });

  it("shows the existing best-turn presenter, team and points on the final screen", () => {
    const match = fixture().snapshot.session!;
    const bestTurn = {
      teamId: match.teams[0]!.id,
      teamName: "Foxes",
      describerId: "alex",
      describerName: "Alex",
      score: 8,
      phaseNumber: 2,
      phaseName: "One Word",
    };
    const view = render(<HatDeviceResults match={{ ...match, bestTurnSummary: bestTurn }} />);
    let highlight = within(screen.getByRole("region", { name: "Best turn" }));
    expect(highlight.getByRole("heading", { name: "Best turn · 8 points" })).toBeInTheDocument();
    expect(highlight.getByText("Alex · Foxes")).toBeInTheDocument();
    expect(highlight.getByText("One Word")).toBeInTheDocument();
    view.rerender(
      <HatDeviceResults
        match={{
          ...match,
          results: {
            leaderboard: [],
            winnerTeamIds: [],
            isTie: false,
            totalClues: match.cluePool.length,
            bestTurn: { ...bestTurn, score: 1 },
          },
        }}
      />,
    );
    highlight = within(screen.getByRole("region", { name: "Best turn" }));
    expect(highlight.getByRole("heading", { name: "Best turn · 1 point" })).toBeInTheDocument();
  });
});
