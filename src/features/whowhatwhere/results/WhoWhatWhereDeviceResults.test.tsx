import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createMatch } from "@/domain/whowhatwhere/game";
import { createDefaultSettings, createTeamSetups } from "@/domain/whowhatwhere/setup";
import type { LastTurnSummary, WordEntry, WordHistoryEntry } from "@/domain/whowhatwhere/types";

import { WhoWhatWhereDeviceRecap } from "./WhoWhatWhereDeviceResults";

const word: WordEntry = { word: "Lighthouse", category: "What", hint: "A coastal beacon" };
const baseMatch = createMatch(createTeamSetups(2), createDefaultSettings());

function action(
  status: WordHistoryEntry["status"],
  source: WordHistoryEntry["source"],
  clue = word,
): WordHistoryEntry {
  return { word: clue, status, source, timestamp: "2026-10-21T01:00:00.000Z" };
}

function renderRecap(history: readonly WordHistoryEntry[], finalWord: WordEntry | null = null) {
  const summary: LastTurnSummary = {
    teamId: "team-1",
    teamName: "Foxes",
    describerId: "alex",
    describerName: "Alex",
    scoreDelta: history.filter((entry) => entry.status === "correct").length,
    correctCount: history.filter((entry) => entry.status === "correct").length,
    skippedCount: history.filter((entry) => entry.status === "skipped").length,
    pendingSkippedCount: 0,
    wordHistory: history,
    finalWord,
  };
  render(
    <WhoWhatWhereDeviceRecap
      match={{ ...baseMatch, lastTurnSummary: summary, turnSummaries: [summary] }}
    />,
  );
  return within(screen.getByRole("list", { name: "Turn words" }));
}

describe("device recap replayed words", () => {
  it("lists a replayed success once with its icon immediately before Correct", () => {
    const history = [action("skipped", "main"), action("correct", "skipped")];
    const before = structuredClone(history);
    const list = renderRecap(history, { ...word, word: "Compass" });

    expect(list.getAllByRole("listitem")).toHaveLength(2);
    expect(list.getAllByText("Lighthouse")).toHaveLength(1);
    expect(list.queryByText("Skipped")).not.toBeInTheDocument();
    expect(list.getByText("Unplayed")).toBeInTheDocument();
    const icon = list.getByRole("img", { name: "Replayed" });
    expect(icon.parentElement).toBe(list.getByText("Correct"));
    expect(icon.nextSibling?.textContent).toBe("Correct");
    expect(history).toEqual(before);
  });

  it("removes every skip attempt for the occurrence eventually guessed", () => {
    const list = renderRecap([
      action("skipped", "main"),
      action("skipped", "skipped"),
      action("skipped", "skipped"),
      action("correct", "skipped"),
    ]);

    expect(list.getAllByRole("listitem")).toHaveLength(1);
    expect(list.getByText("Correct")).toBeInTheDocument();
    expect(list.getByRole("img", { name: "Replayed" })).toBeInTheDocument();
  });

  it("keeps a main-deck success separate from an unresolved identical skip", () => {
    const list = renderRecap([action("skipped", "main"), action("correct", "main")]);

    expect(list.getAllByText("Lighthouse")).toHaveLength(2);
    expect(list.getByText("Skipped")).toBeInTheDocument();
    expect(list.getByText("Correct")).toBeInTheDocument();
    expect(list.queryByRole("img", { name: "Replayed" })).not.toBeInTheDocument();
  });

  it("resolves only one pending occurrence when identical clues were skipped twice", () => {
    const list = renderRecap([
      action("skipped", "main"),
      action("skipped", "main"),
      action("correct", "skipped"),
    ]);

    expect(list.getAllByText("Lighthouse")).toHaveLength(2);
    expect(list.getByText("Skipped")).toBeInTheDocument();
    expect(list.getByText("Correct")).toBeInTheDocument();
    expect(list.getAllByRole("img", { name: "Replayed" })).toHaveLength(1);
  });

  it("keeps matching spellings distinct when their clue metadata differs", () => {
    const otherWord = { ...word, category: "Where" as const, hint: "A place on the coast" };
    const list = renderRecap([
      action("skipped", "main"),
      action("skipped", "main", otherWord),
      action("correct", "skipped", otherWord),
    ]);

    const rows = list.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText("Skipped")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Correct")).toBeInTheDocument();
  });

  it("preserves unresolved skips and ordinary correct rows without a replay icon", () => {
    const list = renderRecap([
      action("correct", "main", { ...word, word: "Compass" }),
      action("skipped", "main"),
    ]);

    expect(list.getAllByRole("listitem")).toHaveLength(2);
    expect(list.getByText("Correct")).toBeInTheDocument();
    expect(list.getByText("Skipped")).toBeInTheDocument();
    expect(list.queryByRole("img", { name: "Replayed" })).not.toBeInTheDocument();
  });
});
