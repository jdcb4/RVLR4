import { describe, expect, it } from "vitest";

import {
  correctWord,
  createMatch,
  endTurn,
  getActiveContext,
  getCurrentWord,
  returnSkippedWord,
  revealHint,
  showResults,
  skipWord,
  startTurn,
} from "./game";
import { createDefaultSettings, createTeamSetups } from "./setup";
import type { Category, WordEntry } from "./types";

const now = new Date("2026-05-05T10:00:00.000Z");

function wordsFor(category: Category, count = 100): WordEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    word: `${category} ${index}`,
    category,
    hint: `Hint ${index}`,
  }));
}

describe("game domain", () => {
  it("creates a match with normalized team state", () => {
    const match = createMatch(createTeamSetups(2), createDefaultSettings());

    expect(match.stage).toBe("ready");
    expect(match.players).toHaveLength(4);
    expect(getActiveContext(match).describer.name).toBe("Mozart");
  });

  it("starts a turn with word entries and records correct answers", () => {
    const match = startTurn(
      createMatch(createTeamSetups(2), createDefaultSettings()),
      wordsFor("What"),
      now,
      () => 0,
    );

    expect(match.activeTurn?.wordQueue[0]?.hint).toMatch(/^Hint /);

    const afterCorrect = correctWord(match, new Date("2026-05-05T10:00:01.000Z"));

    expect(afterCorrect.activeTurn?.score).toBe(1);
    expect(afterCorrect.activeTurn?.correctCount).toBe(1);
    expect(afterCorrect.activeTurn?.wordHistory[0]?.status).toBe("correct");
  });

  it("handles skipped words and returns a selected skipped word", () => {
    const match = startTurn(
      createMatch(createTeamSetups(2), createDefaultSettings()),
      wordsFor("What"),
      now,
      () => 0,
    );
    const afterSkip = skipWord(match, new Date("2026-05-05T10:00:01.000Z"));
    const skippedWord = afterSkip.activeTurn?.skippedWords[0];

    expect(skippedWord).toBeDefined();

    const returned = returnSkippedWord(afterSkip, skippedWord?.id);

    expect(getCurrentWord(returned.activeTurn)?.word).toBe(skippedWord?.word.word);
    expect(returned.activeTurn?.currentWordSource).toBe("skipped");
  });

  it("rotates teams, completes rounds, and builds tie results", () => {
    const settings = { ...createDefaultSettings(), totalRounds: 1 as const };
    const words = wordsFor("What");
    const firstTurn = startTurn(
      createMatch(createTeamSetups(2), settings),
      words,
      now,
      () => 0,
    );
    const firstScored = correctWord(firstTurn, new Date("2026-05-05T10:00:01.000Z"));
    const secondReady = endTurn(firstScored);
    const secondTurn = startTurn(secondReady, words, now, () => 0);
    const results = endTurn(secondTurn);

    expect(secondReady.stage).toBe("ready");
    expect(getActiveContext(secondReady).team.id).toBe("team-2");
    expect(results.stage).toBe("finalSummary");
    expect(results.results?.isTie).toBe(false);
    expect(results.results?.bestTurn?.describerName).toBe("Mozart");
    expect(results.lastTurnSummary?.finalWord?.word).toMatch(/^What /);
    expect(showResults(results).stage).toBe("results");
  });

  it("initializes hint state from settings and is a no-op when limit is 0", () => {
    const match = startTurn(
      createMatch(createTeamSetups(2), createDefaultSettings()),
      wordsFor("What"),
      now,
      () => 0,
    );

    // Default settings: perTurnLimit 0 → no hints available.
    expect(match.activeTurn?.hintsRemaining).toBe(0);
    expect(match.activeTurn?.currentWordHintRevealed).toBe(false);

    const tryReveal = revealHint(match);
    expect(tryReveal.activeTurn?.hintsRemaining).toBe(0);
    expect(tryReveal.activeTurn?.currentWordHintRevealed).toBe(false);
  });

  it("revealHint decrements hintsRemaining and reveals current word, idempotent on second tap", () => {
    const settings = {
      ...createDefaultSettings(),
      hints: { enabled: true, perTurnLimit: 2 as const },
    };
    const match = startTurn(
      createMatch(createTeamSetups(2), settings),
      wordsFor("What"),
      now,
      () => 0,
    );

    expect(match.activeTurn?.hintsRemaining).toBe(2);

    const afterReveal = revealHint(match);
    expect(afterReveal.activeTurn?.hintsRemaining).toBe(1);
    expect(afterReveal.activeTurn?.currentWordHintRevealed).toBe(true);

    // Second tap on the same word is a no-op — only one consumption per word.
    const afterSecondTap = revealHint(afterReveal);
    expect(afterSecondTap.activeTurn?.hintsRemaining).toBe(1);
    expect(afterSecondTap.activeTurn?.currentWordHintRevealed).toBe(true);
  });

  it("hint reveal resets on word change (correct, skip, returnSkipped)", () => {
    const settings = {
      ...createDefaultSettings(),
      hints: { enabled: true, perTurnLimit: 3 as const },
    };
    let match = startTurn(
      createMatch(createTeamSetups(2), settings),
      wordsFor("What"),
      now,
      () => 0,
    );

    match = revealHint(match);
    expect(match.activeTurn?.currentWordHintRevealed).toBe(true);
    match = correctWord(match, new Date("2026-05-05T10:00:01.000Z"));
    expect(match.activeTurn?.currentWordHintRevealed).toBe(false);

    match = revealHint(match);
    expect(match.activeTurn?.currentWordHintRevealed).toBe(true);
    match = skipWord(match, new Date("2026-05-05T10:00:02.000Z"));
    expect(match.activeTurn?.currentWordHintRevealed).toBe(false);

    // After two reveals the budget should be 1 remaining (3 - 2).
    expect(match.activeTurn?.hintsRemaining).toBe(1);

    const skippedId = match.activeTurn?.skippedWords[0]?.id;
    match = revealHint(match);
    expect(match.activeTurn?.currentWordHintRevealed).toBe(true);

    match = returnSkippedWord(match, skippedId);
    expect(match.activeTurn?.currentWordHintRevealed).toBe(false);
    // returnSkipped should not consume a hint slot; reveal counter is now 0 used after skip undo.
    expect(match.activeTurn?.hintsRemaining).toBe(0);
  });

  it("revealHint is a no-op once the turn budget hits 0", () => {
    const settings = {
      ...createDefaultSettings(),
      hints: { enabled: true, perTurnLimit: 1 as const },
    };
    let match = startTurn(
      createMatch(createTeamSetups(2), settings),
      wordsFor("What"),
      now,
      () => 0,
    );

    match = revealHint(match);
    match = correctWord(match, new Date("2026-05-05T10:00:01.000Z"));

    expect(match.activeTurn?.hintsRemaining).toBe(0);

    // New word, no hints left — no change.
    const exhausted = revealHint(match);
    expect(exhausted.activeTurn?.hintsRemaining).toBe(0);
    expect(exhausted.activeTurn?.currentWordHintRevealed).toBe(false);
  });

  it("fails to start when no selected category words exist", () => {
    const settings = {
      ...createDefaultSettings(),
      selectedCategories: ["Where"] as const,
    };
    const match = createMatch(createTeamSetups(2), settings);

    expect(() => startTurn(match, wordsFor("What"), now, () => 0)).toThrow(
      "No words available for Where.",
    );
  });
});
