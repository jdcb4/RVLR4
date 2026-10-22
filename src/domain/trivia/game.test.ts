import { describe, expect, it } from "vitest";

import type { TriviaQuestion } from "@/data/triviaSchema";

import type { TriviaQuiz, TriviaSettings } from "./game";
import {
  createTriviaSession,
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
  schemaVersion: 3,
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
    first.settings.categories.pop();
    expect(second.settings).toMatchObject({
      count: 10,
      revealMode: "each",
      difficulty: "hard",
    });
    expect(second.settings.categories).toHaveLength(8);
    expect(triviaSessionSchema.safeParse(second).success).toBe(true);
    for (const input of [
      settings({ count: 0 }),
      settings({ count: 101 }),
      settings({ categories: [] }),
      settings({ categories: ["history", "history"] }),
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
    input.categories.pop();
    expect(quiz.items.every((item) => item.question.answer !== "Changed in replacement pack")).toBe(
      true,
    );
    expect(quiz.settings.categories).toEqual(["general", "history"]);
    valid(quiz);
  });

  it("balances allowed difficulties before categories and validates cumulative selections", () => {
    const bank = Array.from({ length: 36 }, (_, index) =>
      question(index, {
        difficulty: (["easy", "medium", "hard"] as const)[index % 3]!,
        category: index < 18 ? "general" : "history",
      }),
    );
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const quiz = start({ count: 12, categories: ["general", "history"], difficulty }, bank);
      const counts = ["easy", "medium", "hard"].map(
        (rating) => quiz.items.filter((item) => item.question.difficulty === rating).length,
      );
      expect(counts).toEqual(
        difficulty === "easy" ? [12, 0, 0] : difficulty === "medium" ? [6, 6, 0] : [4, 4, 4],
      );
      expect(quiz.items.filter((item) => item.question.category === "general")).toHaveLength(6);
      valid(quiz);
    }
  });

  it("fills missing difficulty shares from allowed questions without widening Medium", () => {
    const bank = [
      question(1),
      question(2),
      question(3),
      question(4, { difficulty: "medium" }),
      question(5, { difficulty: "hard" }),
    ];
    const quiz = start({ count: 4, difficulty: "medium" }, bank);
    expect(quiz.items.map((item) => item.question.difficulty).sort()).toEqual([
      "easy",
      "easy",
      "easy",
      "medium",
    ]);
    valid(quiz);
    expect(() => start({ count: 5, difficulty: "medium" }, bank)).toThrow("Only 4 eligible");
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
    quiz = nextTriviaQuestion(setTriviaMark(revealTriviaAnswer(quiz), true), now + 1);
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
          ? { ...item, revealed: true, mark: true }
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

  it("requires reveal and a manual mark in each mode without accepting written answers", () => {
    let quiz = start();
    expect(nextTriviaQuestion(quiz, now)).toBe(quiz);
    expect(setTriviaMark(quiz, true)).toBe(quiz);
    expect(setTriviaAnswer(quiz, "Written answer")).toBe(quiz);
    expect(quiz.items[0]?.writtenAnswer).toBe("");
    quiz = revealTriviaAnswer(quiz);
    expect(quiz.items[0]?.mark).toBeNull();
    expect(nextTriviaQuestion(quiz, now)).toBe(quiz);
    expect(setTriviaAnswer(quiz, "Changed after reveal")).toBe(quiz);
    valid(quiz);
    quiz = setTriviaMark(quiz, true);
    expect(quiz.items[0]?.mark).toBe(true);
    quiz = setTriviaMark(quiz, false);
    expect(quiz.items[0]?.mark).toBe(false);
    quiz = nextTriviaQuestion(quiz, now);
    quiz = nextTriviaQuestion(setTriviaMark(revealTriviaAnswer(quiz), true), now);
    expect(quiz.phase).toBe("results");
    expect(nextTriviaQuestion(quiz, now)).toBe(quiz);
    expect(setTriviaAnswer(quiz, "Too late")).toBe(quiz);
    expect(setTriviaMark(quiz, false)).toBe(quiz);
    expect(quiz.items.map((item) => item.mark)).toEqual([false, true]);
    valid(quiz);
  });

  it("retains all written answers in end mode, then reveals one answer at a time", () => {
    let quiz = start({ revealMode: "end" });
    quiz = setTriviaAnswer(quiz, "First answer");
    expect(revealTriviaAnswer(quiz)).toBe(quiz);
    quiz = nextTriviaQuestion(quiz, now);
    expect(quiz.phase).toBe("questions");
    expect(quiz.items[0]?.revealed).toBe(false);
    valid(quiz);
    quiz = setTriviaAnswer(quiz, "Second answer");
    quiz = nextTriviaQuestion(quiz, now);
    expect(quiz).toMatchObject({ phase: "answers", cursor: 0 });
    expect(quiz.items.map((item) => item.revealed)).toEqual([true, false]);
    expect(setTriviaAnswer(quiz, "Too late")).toBe(quiz);
    expect(quiz.items[0]?.mark).toBeNull();
    expect(nextTriviaQuestion(quiz, now)).toBe(quiz);
    valid(quiz);
    quiz = nextTriviaQuestion(setTriviaMark(quiz, true), now);
    expect(quiz.items[1]).toMatchObject({ revealed: true, writtenAnswer: "Second answer" });
    quiz = nextTriviaQuestion(setTriviaMark(quiz, false), now);
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
    expect(review.items[1]?.mark).toBeNull();
    expect(nextTriviaQuestion(review, now + 1)).toBe(review);
    const results = nextTriviaQuestion(setTriviaMark(review, false), now + 1);
    expect(results.phase).toBe("results");
    valid(results);
  });

  it.each([
    ["  aNSWER \t 1 \n", true],
    ["  accepted \n ALIAS  ", true],
    ["Answer 1!", null],
    ["Anser 1", null],
    ["Answer1", null],
    ["Accepted-alias", null],
    ["", null],
    [" \t\n ", null],
    ["Wrong answer", null],
  ] as const)("defaults the revealed end-mode mark for %j to %s", (written, expected) => {
    let quiz = start({ count: 1, revealMode: "end" }, [
      question(1, { acceptableAnswers: ["Accepted alias"] }),
    ]);
    quiz = setTriviaAnswer(quiz, written);
    expect(quiz.items[0]?.mark).toBeNull();
    expect(setTriviaMark(quiz, true)).toBe(quiz);
    quiz = nextTriviaQuestion(quiz, now);
    expect(quiz.items[0]?.mark).toBe(expected);
    expect(quiz.items[0]?.writtenAnswer).toBe(written);
    valid(quiz);
    if (expected === null) expect(nextTriviaQuestion(quiz, now)).toBe(quiz);
    quiz = setTriviaMark(quiz, false);
    expect(quiz.items[0]?.mark).toBe(false);
    expect(revealTriviaAnswer(quiz)).toBe(quiz);
    const restored = triviaSessionSchema.parse(JSON.parse(JSON.stringify(session(quiz)))).quiz!;
    expect(restored.items[0]?.mark).toBe(false);
    const completed = nextTriviaQuestion(restored, now);
    expect(completed.phase).toBe("results");
    valid(completed);
  });

  it("assigns exact-match defaults only as each end-mode answer is revealed", () => {
    let quiz = start({ revealMode: "end" });
    quiz = setTriviaAnswer(quiz, quiz.items[0]!.question.answer);
    quiz = nextTriviaQuestion(quiz, now);
    quiz = setTriviaAnswer(quiz, quiz.items[1]!.question.answer);
    expect(quiz.items.map((item) => item.mark)).toEqual([null, null]);
    quiz = nextTriviaQuestion(quiz, now);
    expect(quiz.items.map((item) => item.mark)).toEqual([true, null]);
    quiz = setTriviaMark(quiz, false);
    quiz = nextTriviaQuestion(quiz, now);
    expect(quiz.items.map((item) => item.mark)).toEqual([false, true]);
    quiz = nextTriviaQuestion(quiz, now);
    expect(quiz.phase).toBe("results");
    valid(quiz);
  });

  it("bounds the shared written answer", () => {
    const quiz = start({ revealMode: "end" });
    expect(setTriviaAnswer(quiz, "x".repeat(500)).items[0]?.writtenAnswer).toHaveLength(500);
    expect(() => setTriviaAnswer(quiz, "x".repeat(501))).toThrow("500");
  });

  it("rejects corrupted dimensions, identities, references and progression in saved state", () => {
    const quiz = start();
    const variants = [
      { ...quiz, cursor: 2 },
      { ...quiz, settings: { ...quiz.settings, count: 1 } },
      { ...quiz, phase: "answers" },
      {
        ...quiz,
        items: quiz.items.map((item, index) =>
          index === 0 ? { ...item, writtenAnswer: [] } : item,
        ),
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
          index === 0 ? { ...item, writtenAnswer: "x".repeat(501) } : item,
        ),
      },
      {
        ...quiz,
        items: quiz.items.map((item, index) => (index === 0 ? { ...item, mark: true } : item)),
      },
      {
        ...quiz,
        items: quiz.items.map((item, index) => (index === 1 ? { ...item, mark: false } : item)),
      },
      {
        ...quiz,
        items: quiz.items.map((item, index) =>
          index === 0 ? { ...item, revealed: true, mark: "correct" } : item,
        ),
      },
      {
        ...quiz,
        items: quiz.items.map((item, index) =>
          index === 0 ? { ...item, writtenAnswer: "Not allowed in each mode" } : item,
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
        settings: { ...quiz.settings, revealMode: "end" },
      }).success,
    ).toBe(false);
    expect(triviaSessionSchema.safeParse({ ...session(quiz), schemaVersion: 2 }).success).toBe(
      false,
    );
    expect(triviaSettingsSchema.safeParse({ ...quiz.settings, teams: ["Old team"] }).success).toBe(
      false,
    );
  });

  it("rejects missing marks on reviewed answers and all marks on excluded questions", () => {
    let quiz = start();
    quiz = nextTriviaQuestion(setTriviaMark(revealTriviaAnswer(quiz), true), now);
    const pastUnmarked = {
      ...quiz,
      items: quiz.items.map((item, index) => (index === 0 ? { ...item, mark: null } : item)),
    };
    expect(triviaSessionSchema.safeParse(session(pastUnmarked)).success).toBe(false);
    quiz = nextTriviaQuestion(setTriviaMark(revealTriviaAnswer(quiz), false), now);
    const completedUnmarked = {
      ...quiz,
      items: quiz.items.map((item, index) => (index === 1 ? { ...item, mark: null } : item)),
    };
    expect(triviaSessionSchema.safeParse(session(completedUnmarked)).success).toBe(false);
    const excludedMarked = {
      ...quiz,
      items: quiz.items.map((item, index) =>
        index === 1
          ? { ...item, excluded: true, revealed: false, shownAt: null, mark: false }
          : item,
      ),
    };
    expect(triviaSessionSchema.safeParse(session(excludedMarked)).success).toBe(false);
    valid(quiz);
  });

  it("keeps ordinary 100-question quizzes within the native snapshot limit", () => {
    let quiz = start(
      { count: 100, revealMode: "end" },
      Array.from({ length: 100 }, (_, index) => question(index)),
    );
    for (let index = 0; index < 100; index++) {
      quiz = setTriviaAnswer(quiz, "x".repeat(500));
      quiz = nextTriviaQuestion(quiz, now);
    }
    for (let index = 0; index < 100; index++)
      quiz = nextTriviaQuestion(setTriviaMark(quiz, index % 2 === 0), now);
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
