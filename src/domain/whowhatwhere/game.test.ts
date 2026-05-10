import { describe, expect, it } from "vitest";

import {
  correctWord,
  createMatch,
  endTurn,
  getActiveContext,
  getCurrentWord,
  returnSkippedWord,
  showResults,
  skipWord,
  startTurn,
} from "./game";
import { createDefaultSettings, createTeamSetups } from "./setup";
import type { WordEntry } from "./types";

const now = new Date("2026-05-05T10:00:00.000Z");

function wordsFor(category: string, count = 100): WordEntry[] {
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
