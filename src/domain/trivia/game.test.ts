import { describe, expect, it } from "vitest";

import type { TriviaQuestion } from "@/data/triviaSchema";

import type { TriviaQuiz, TriviaSettings } from "./game";
import {
  createTriviaSession,
  getTriviaScores,
  nextTriviaQuestion,
  prepareTriviaQuiz,
  revealTriviaAnswer,
  setTriviaAnswer,
  setTriviaMark,
  startTriviaQuiz,
  triviaSessionSchema,
  triviaSettingsSchema,
} from "./game";

const now = Date.UTC(2026, 9, 22, 12);
const iso = (value: number) => new Date(value).toISOString();
const question = (id: number, overrides: Partial<TriviaQuestion> = {}): TriviaQuestion => ({
  id: `trivia:fixture-${String(id)}`,
  revision: 1,
  question: `Fixture question ${String(id)}?`,
  answer: `Answer ${String(id)}`,
  acceptableAnswers: [],
  category: "general",
  difficulty: "easy",
  kidAppropriate: true,
  review: {
    reviewedAt: iso(now - 10000),
    reviewer: "Test fixture",
    sources: ["https://example.com/source"],
  },
  ...overrides,
});
const settings = (overrides: Partial<TriviaSettings> = {}): TriviaSettings => ({
  ...createTriviaSession().settings,
  count: 2,
  ...overrides,
});
const start = (overrides: Partial<TriviaSettings> = {}, questions = [question(1), question(2)]) =>
  startTriviaQuiz(settings(overrides), questions, {
    kidsMode: false,
    packVersion: 2,
    now,
    rng: () => 0.5,
  });
const session = (quiz: TriviaQuiz) => ({
  schemaVersion: 1,
  savedAt: iso(now),
  settings: quiz.settings,
  quiz,
});
const valid = (quiz: TriviaQuiz) =>
  expect(triviaSessionSchema.safeParse(session(quiz)).success).toBe(true);

describe("Trivia rules and durable sessions", () => {
  it("starts with independent default settings and validates the setup limits", () => {
    const first = createTriviaSession();
    const second = createTriviaSession();
    first.settings.teams.push("Extra");
    expect(second.settings).toMatchObject({
      count: 10,
      revealMode: "each",
      difficulty: "all",
      teams: ["Team 1", "Team 2"],
    });
    expect(second.settings.categories).toHaveLength(8);
    expect(triviaSessionSchema.safeParse(second).success).toBe(true);
    for (const input of [
      settings({ count: 0 }),
      settings({ count: 101 }),
      settings({ categories: [] }),
      settings({ categories: ["history", "history"] }),
      settings({ teams: [] }),
      settings({ teams: Array.from({ length: 9 }, () => "Team") }),
      settings({ teams: ["x".repeat(41)] }),
    ]) {
      expect(triviaSettingsSchema.safeParse(input).success).toBe(false);
    }
  });

  it("balances category buckets and snapshots selected questions and settings", () => {
    const bank = Array.from({ length: 9 }, (_, index) =>
      question(index, { category: index < 6 ? "general" : "history" }),
    );
    const input = settings({ count: 6, categories: ["general", "history"] });
    const quiz = startTriviaQuiz(input, bank, {
      kidsMode: false,
      packVersion: 2,
      now,
      rng: () => 0.5,
    });
    expect(quiz.items.filter((item) => item.question.category === "general")).toHaveLength(3);
    expect(new Set(quiz.items.map((item) => item.question.id)).size).toBe(6);
    expect(quiz.items[0]?.shownAt).toBe(iso(now));
    bank.forEach((item) => {
      item.answer = "Changed in replacement pack";
    });
    input.teams[0] = "Changed team";
    expect(quiz.items.every((item) => item.question.answer !== "Changed in replacement pack")).toBe(
      true,
    );
    expect(quiz.settings.teams[0]).toBe("Team 1");
    valid(quiz);
  });

  it("filters kids suitability, difficulty, category, expiry and duplicate identities without widening", () => {
    const bank = [
      question(1),
      question(2, { kidAppropriate: false }),
      question(3, { difficulty: "hard" }),
      question(4, { category: "history" }),
      question(5, { expiresAt: iso(now) }),
      question(1),
      question(6, { question: "FIXTURE QUESTION 1!" }),
    ];
    expect(() =>
      startTriviaQuiz(settings({ count: 2, categories: ["general"], difficulty: "easy" }), bank, {
        kidsMode: true,
        packVersion: 2,
        now,
      }),
    ).toThrow("Only 1 eligible");
    const quiz = startTriviaQuiz(
      settings({ count: 1, categories: ["general"], difficulty: "easy" }),
      bank,
      { kidsMode: true, packVersion: 2, now },
    );
    expect(quiz.items[0]?.question.id).toBe("trivia:fixture-1");
    expect(() => start({}, [])).toThrow("Only 0 eligible");
  });

  it("rechecks exclusive expiry before each first presentation while retaining shown questions", () => {
    let quiz = start({}, [
      question(1, { expiresAt: iso(now + 1) }),
      question(2, { expiresAt: iso(now + 1) }),
    ]);
    const shown = quiz.items[0]?.question.id;
    quiz = prepareTriviaQuiz(quiz, now + 1);
    expect(quiz.items[0]?.question.id).toBe(shown);
    expect(quiz.items[0]?.excluded).toBe(false);
    quiz = nextTriviaQuestion(revealTriviaAnswer(quiz), now + 1);
    expect(quiz.phase).toBe("results");
    expect(quiz.items[1]).toMatchObject({ shownAt: null, excluded: true, revealed: false });
    valid(quiz);
  });

  it("skips an expired question on resume and durably prepares the next eligible one", () => {
    const quiz = start({ count: 3 }, [question(1), question(2), question(3)]);
    const resumed: TriviaQuiz = {
      ...quiz,
      cursor: 1,
      items: quiz.items.map((item, index) =>
        index === 0
          ? { ...item, revealed: true }
          : index === 1
            ? { ...item, question: { ...item.question, expiresAt: iso(now + 1) } }
            : item,
      ),
    };
    const prepared = prepareTriviaQuiz(resumed, now + 1);
    expect(prepared.cursor).toBe(2);
    expect(prepared.items[1]?.excluded).toBe(true);
    expect(prepared.items[2]?.shownAt).toBe(iso(now + 1));
    expect(resumed.items[2]?.shownAt).toBeNull();
    expect(prepareTriviaQuiz(prepared, now + 100)).toBe(prepared);
    valid(prepared);
  });

  it("handles a restored completely unshown quiz whose entire selection expired", () => {
    const quiz = start({ revealMode: "end" }, [
      question(1, { expiresAt: iso(now + 1) }),
      question(2, { expiresAt: iso(now + 1) }),
    ]);
    const unshown = { ...quiz, items: quiz.items.map((item) => ({ ...item, shownAt: null })) };
    const exhausted = prepareTriviaQuiz(unshown, now + 1);
    expect(exhausted.phase).toBe("results");
    expect(exhausted.items.every((item) => item.excluded)).toBe(true);
    valid(exhausted);
  });

  it("requires reveal in each mode, locks written answers and scores manual marks", () => {
    let quiz = start();
    expect(nextTriviaQuestion(quiz, now)).toBe(quiz);
    expect(setTriviaMark(quiz, 0, true)).toBe(quiz);
    quiz = setTriviaAnswer(quiz, 0, "Optional written answer");
    expect(quiz.items[0]?.writtenAnswers[0]).toBe("Optional written answer");
    quiz = revealTriviaAnswer(quiz);
    expect(setTriviaAnswer(quiz, 0, "Changed after reveal")).toBe(quiz);
    quiz = setTriviaMark(quiz, 0, true);
    quiz = setTriviaMark(quiz, 1, false);
    expect(getTriviaScores(quiz)).toEqual([1, 0]);
    valid(quiz);
    quiz = nextTriviaQuestion(quiz, now);
    quiz = setTriviaMark(revealTriviaAnswer(quiz), 1, true);
    quiz = nextTriviaQuestion(quiz, now);
    expect(quiz.phase).toBe("results");
    expect(getTriviaScores(quiz)).toEqual([1, 1]);
    expect(nextTriviaQuestion(quiz, now)).toBe(quiz);
    expect(setTriviaMark(quiz, 1, null)).toBe(quiz);
    valid(quiz);
  });

  it("retains all written answers in end mode, then reveals and marks one answer at a time", () => {
    let quiz = start({ revealMode: "end" });
    quiz = setTriviaAnswer(quiz, 0, "First answer");
    expect(revealTriviaAnswer(quiz)).toBe(quiz);
    quiz = nextTriviaQuestion(quiz, now);
    expect(quiz.phase).toBe("questions");
    expect(quiz.items[0]?.revealed).toBe(false);
    valid(quiz);
    quiz = setTriviaAnswer(quiz, 1, "Second answer");
    quiz = nextTriviaQuestion(quiz, now);
    expect(quiz).toMatchObject({ phase: "answers", cursor: 0 });
    expect(quiz.items.map((item) => item.revealed)).toEqual([true, false]);
    expect(setTriviaAnswer(quiz, 0, "Too late")).toBe(quiz);
    quiz = setTriviaMark(quiz, 0, true);
    quiz = setTriviaMark(quiz, 0, null);
    expect(getTriviaScores(quiz)).toEqual([0, 0]);
    valid(quiz);
    quiz = nextTriviaQuestion(quiz, now);
    expect(quiz.items[1]).toMatchObject({ revealed: true, writtenAnswers: ["", "Second answer"] });
    quiz = nextTriviaQuestion(quiz, now);
    expect(quiz.phase).toBe("results");
    valid(quiz);
  });

  it("reviews only shown questions when the remaining end-mode selection expires", () => {
    const quiz = start({ revealMode: "end" }, [
      question(1, { expiresAt: iso(now + 1) }),
      question(2, { expiresAt: iso(now + 1) }),
    ]);
    const review = nextTriviaQuestion(quiz, now + 1);
    expect(review).toMatchObject({ phase: "answers", cursor: 0 });
    expect(review.items[1]?.excluded).toBe(true);
    valid(review);
    valid(nextTriviaQuestion(review, now + 1));
  });

  it("bounds written answers and rejects unknown team indexes", () => {
    const quiz = start();
    expect(setTriviaAnswer(quiz, 0, "x".repeat(500)).items[0]?.writtenAnswers[0]).toHaveLength(500);
    expect(() => setTriviaAnswer(quiz, 0, "x".repeat(501))).toThrow("500");
    expect(() => setTriviaAnswer(quiz, -1, "Answer")).toThrow("Unknown trivia team");
    expect(() => setTriviaMark(quiz, 0.5, true)).toThrow("Unknown trivia team");
  });

  it("rejects corrupted dimensions, identities, references and progression in saved state", () => {
    const quiz = start();
    const variants = [
      { ...quiz, cursor: 2 },
      { ...quiz, settings: { ...quiz.settings, count: 1 } },
      { ...quiz, phase: "answers" },
      {
        ...quiz,
        items: quiz.items.map((item, index) => (index === 0 ? { ...item, marks: [] } : item)),
      },
      {
        ...quiz,
        items: quiz.items.map((item, index) =>
          index === 1 ? { ...item, question: quiz.items[0]!.question } : item,
        ),
      },
      {
        ...quiz,
        items: quiz.items.map((item, index) =>
          index === 1 ? { ...item, shownAt: iso(now) } : item,
        ),
      },
      {
        ...quiz,
        items: quiz.items.map((item, index) =>
          index === 0 ? { ...item, question: { ...item.question, expiresAt: iso(now) } } : item,
        ),
      },
      {
        ...quiz,
        items: quiz.items.map((item, index) =>
          index === 0 ? { ...item, marks: [true, null] } : item,
        ),
      },
    ];
    variants.forEach((variant) =>
      expect(triviaSessionSchema.safeParse({ ...session(quiz), quiz: variant }).success).toBe(
        false,
      ),
    );
    expect(
      triviaSessionSchema.safeParse({
        ...session(quiz),
        settings: { ...quiz.settings, teams: ["Other", "Teams"] },
      }).success,
    ).toBe(false);
  });

  it("keeps ordinary 100-question eight-team games within the native snapshot limit", () => {
    let quiz = start(
      { count: 100, teams: Array.from({ length: 8 }, (_, index) => `Team ${String(index)}`) },
      Array.from({ length: 100 }, (_, index) => question(index)),
    );
    for (let index = 0; index < 100; index++) {
      for (let team = 0; team < 8; team++) quiz = setTriviaAnswer(quiz, team, "x".repeat(500));
      quiz = nextTriviaQuestion(revealTriviaAnswer(quiz), now);
    }
    valid(quiz);
    expect(new TextEncoder().encode(JSON.stringify(session(quiz))).byteLength).toBeLessThan(
      1024 * 1024,
    );
  });

  it("rejects a selected source snapshot that exceeds the native byte budget", () => {
    const bank = Array.from({ length: 100 }, (_, index) =>
      question(index, {
        review: {
          reviewedAt: iso(now),
          reviewer: "Fixture",
          sources: Array.from(
            { length: 10 },
            (_, source) => `https://example.com/${String(source)}/${"x".repeat(1900)}`,
          ),
        },
      }),
    );
    expect(() => start({ count: 100 }, bank)).toThrow("1 MiB");
  });
});
