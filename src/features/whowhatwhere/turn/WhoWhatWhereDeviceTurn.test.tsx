import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  correctWord,
  createMatch,
  returnSkippedWord,
  revealHint,
  skipWord,
  startTurn,
} from "@/domain/whowhatwhere/game";
import { createDefaultSettings, createTeamSetups } from "@/domain/whowhatwhere/setup";
import type { Category } from "@/domain/whowhatwhere/types";

import { WhoWhatWhereDeviceTurn } from "./WhoWhatWhereDeviceTurn";

const now = new Date("2026-10-21T10:00:00Z");

function createTurn(category: Category = "What") {
  return startTurn(
    createMatch(createTeamSetups(2), {
      ...createDefaultSettings(),
      selectedCategories: [category],
      skipLimit: -1,
      hints: { enabled: true, perTurnLimit: 1 },
    }),
    Array.from({ length: 30 }, (_, index) => ({
      word: `${category} clue ${index}`,
      category,
      hint: `Hint ${index}`,
    })),
    now,
    () => 0,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("phone active turn", () => {
  it("keeps the selected skipped word visible until correct and every other skip tappable", async () => {
    const user = userEvent.setup();
    let match = createTurn();
    for (let index = 0; index < 8; index += 1) match = skipWord(match, now);
    const skipped = match.activeTurn!.skippedWords;
    match = returnSkippedWord(match, skipped[0]!.id);
    const onReturnSkipped = vi.fn();
    const props = { secondsRemaining: 24, onReturnSkipped };
    const view = render(<WhoWhatWhereDeviceTurn {...props} match={match} />);
    const list = screen.getByRole("region", { name: "Skipped words, scroll to see more" });

    expect(within(list).getAllByRole("button")).toHaveLength(8);
    expect(screen.getByRole("heading", { name: "Skipped · 8" })).toBeInTheDocument();
    expect(
      within(list).getByRole("button", { name: `${skipped[0]!.word.word} In play` }),
    ).toBeDisabled();
    const last = within(list).getByRole("button", { name: skipped[7]!.word.word });
    await user.click(last);
    expect(onReturnSkipped).toHaveBeenCalledWith(skipped[7]!.id);

    match = returnSkippedWord(match, skipped[7]!.id);
    view.rerender(<WhoWhatWhereDeviceTurn {...props} match={match} />);
    expect(within(list).getByRole("button", { name: skipped[0]!.word.word })).toBeEnabled();
    expect(
      within(list).getByRole("button", { name: `${skipped[7]!.word.word} In play` }),
    ).toBeDisabled();
    expect(within(list).getAllByRole("button")).toHaveLength(8);

    match = correctWord(match, now);
    view.rerender(<WhoWhatWhereDeviceTurn {...props} match={match} />);
    expect(
      within(list).queryByRole("button", { name: new RegExp(skipped[7]!.word.word) }),
    ).toBeNull();
    expect(within(list).getAllByRole("button")).toHaveLength(7);
    expect(
      within(screen.getByRole("region", { name: "Latest guessed words" })).getByText(
        skipped[7]!.word.word,
      ),
    ).toBeInTheDocument();
  });

  it("keeps the complete correct history newest first without skip events", () => {
    let match = createTurn();
    for (let index = 0; index < 4; index += 1) match = correctWord(match, now);
    match = skipWord(match, now);
    match = returnSkippedWord(match, match.activeTurn!.skippedWords[0]!.id);
    match = skipWord(match, now);
    match = correctWord(match, now);
    render(
      <WhoWhatWhereDeviceTurn match={match} secondsRemaining={24} onReturnSkipped={vi.fn()} />,
    );

    const correctHistory = match.activeTurn!.wordHistory.filter(
      (entry) => entry.status === "correct",
    );
    const guessed = screen.getByRole("region", { name: "Latest guessed words" });
    expect(screen.getByRole("heading", { name: "Guessed · 5" })).toBeInTheDocument();
    expect(
      within(guessed)
        .getAllByRole("listitem")
        .map((row) => row.textContent),
    ).toEqual(correctHistory.reverse().map((entry) => entry.word.word));
    expect(within(guessed).queryByText(match.activeTurn!.skippedWords[0]!.word.word)).toBeNull();
  });

  it("reports real rows above and below the skipped window after scroll and resize", () => {
    let match = createTurn();
    for (let index = 0; index < 4; index += 1) match = skipWord(match, now);
    let rowHeight = 52;
    const resizeCallbacks: ResizeObserverCallback[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          resizeCallbacks.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const list = this.closest('[aria-label="Skipped words, scroll to see more"]');
      if (this === list) return new DOMRect(0, 0, 140, 104);
      if (this.tagName === "LI" && list) {
        const index = [...this.parentElement!.children].indexOf(this);
        return new DOMRect(0, index * rowHeight - list.scrollTop, 140, rowHeight);
      }
      return new DOMRect();
    });

    render(
      <WhoWhatWhereDeviceTurn match={match} secondsRemaining={24} onReturnSkipped={vi.fn()} />,
    );
    const list = screen.getByRole("region", { name: "Skipped words, scroll to see more" });
    expect(screen.getByText("+2 below · scroll")).toBeInTheDocument();
    fireEvent.scroll(list, { target: { scrollTop: 52 } });
    expect(screen.getByText("+1 above · +1 below · scroll")).toBeInTheDocument();
    fireEvent.scroll(list, { target: { scrollTop: 104 } });
    expect(screen.getByText("+2 above · scroll")).toBeInTheDocument();

    rowHeight = 26;
    list.scrollTop = 0;
    act(() => resizeCallbacks.forEach((callback) => callback([], {} as ResizeObserver)));
    expect(screen.queryByText(/below · scroll/)).toBeNull();
    expect(screen.queryByText(/above.*scroll/)).toBeNull();
    expect(within(list).getAllByRole("button")).toHaveLength(4);
  });

  it("shows actual scroll cues across the complete guessed history", () => {
    let match = createTurn();
    for (let index = 0; index < 5; index += 1) match = correctWord(match, now);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const list = this.closest('[aria-label="Latest guessed words"]');
      if (this === list) return new DOMRect(0, 0, 140, 104);
      if (this.tagName === "LI" && list) {
        const index = [...this.parentElement!.children].indexOf(this);
        return new DOMRect(0, index * 70 - list.scrollTop, 140, 70);
      }
      return new DOMRect();
    });
    render(
      <WhoWhatWhereDeviceTurn match={match} secondsRemaining={24} onReturnSkipped={vi.fn()} />,
    );
    expect(screen.getByText("+4 below · scroll")).toBeInTheDocument();
    fireEvent.scroll(screen.getByRole("region", { name: "Latest guessed words" }), {
      target: { scrollTop: 246 },
    });
    expect(screen.getByText("+4 above · scroll")).toBeInTheDocument();
  });

  it.each(["Who", "What", "Where"] as const)(
    "keeps the %s category label alongside its color",
    (category) => {
      render(
        <WhoWhatWhereDeviceTurn
          match={createTurn(category)}
          secondsRemaining={24}
          onReturnSkipped={vi.fn()}
        />,
      );
      expect(screen.getByLabelText(`${category} clue`)).toHaveClass(
        `bg-semantic-category-${category.toLowerCase()}-bg`,
      );
      expect(screen.getByText(category, { exact: true })).toBeInTheDocument();
      expect(screen.getByText("Time remaining: 0:24")).toBeInTheDocument();
    },
  );

  it("replaces the hint action with its text and disables the next word when exhausted", async () => {
    const onRevealHint = vi.fn();
    const match = createTurn();
    const props = { secondsRemaining: 24, onReturnSkipped: vi.fn(), onRevealHint };
    const view = render(<WhoWhatWhereDeviceTurn {...props} match={match} />);
    await userEvent.click(screen.getByRole("button", { name: "Hint (1 left)" }));
    expect(onRevealHint).toHaveBeenCalledOnce();

    const revealed = revealHint(match);
    view.rerender(<WhoWhatWhereDeviceTurn {...props} match={revealed} />);
    expect(screen.getByRole("region", { name: "Hint" })).toHaveTextContent(
      match.activeTurn!.wordQueue[0]!.hint,
    );
    expect(screen.queryByRole("button", { name: /Hint/ })).toBeNull();
    expect(screen.queryByText("Hint shown")).toBeNull();

    view.rerender(<WhoWhatWhereDeviceTurn {...props} match={correctWord(revealed, now)} />);
    expect(screen.getByRole("button", { name: "Hint (0 left)" })).toBeDisabled();
    expect(screen.queryByRole("region", { name: "Hint" })).toBeNull();
    expect(onRevealHint).toHaveBeenCalledOnce();
  });
});
