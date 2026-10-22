import { expect, it } from "vitest";

import { createTriviaSession, startTriviaQuiz, triviaSessionSchema } from "@/domain/trivia/game";

import original from "../../../content/trivia/original-pack-v2.json";
import { triviaCategories, triviaPackSchema } from "../triviaSchema";
import raw from "./bundled.json";

it("supplies 150 unique sourced questions across every category and starts a full-length quiz", () => {
  const pack = triviaPackSchema.parse(raw);
  expect(pack.questions).toHaveLength(150);
  expect(new Set(pack.questions.map((question) => question.category))).toEqual(
    new Set(triviaCategories),
  );
  const session = createTriviaSession();
  session.settings.count = 30;
  session.quiz = startTriviaQuiz(session.settings, pack.questions, {
    kidsMode: false,
    packVersion: pack.version,
  });
  expect(triviaSessionSchema.safeParse(session).success).toBe(true);
  expect(new Set(session.quiz.items.map((item) => item.question.id)).size).toBe(30);
  expect(session.quiz.items.filter((item) => item.question.difficulty === "hard")).toHaveLength(10);
  expect(session.quiz.items.every((item) => item.writtenAnswer === "")).toBe(true);
});

it("supports a default ten-question Kids quiz without widening suitability", () => {
  const pack = triviaPackSchema.parse(raw);
  const quiz = startTriviaQuiz(createTriviaSession().settings, pack.questions, {
    kidsMode: true,
    packVersion: pack.version,
  });
  expect(quiz.items).toHaveLength(10);
  expect(quiz.items.every((item) => item.question.kidAppropriate)).toBe(true);
});

it("preserves the original bank and adds five questions at each difficulty in every category", () => {
  const pack = triviaPackSchema.parse(raw);
  const ids = new Set(original.questions.map((question) => question.id));
  expect(pack.questions.filter((question) => ids.has(question.id))).toEqual(original.questions);
  const additions = pack.questions.filter((question) => !ids.has(question.id));
  for (const category of triviaCategories) {
    for (const difficulty of ["easy", "medium", "hard"]) {
      expect(
        additions.filter((q) => q.category === category && q.difficulty === difficulty),
      ).toHaveLength(5);
    }
    expect(
      additions.filter((q) => q.category === category && q.kidAppropriate).length,
    ).toBeGreaterThanOrEqual(5);
  }
});

it.each(["easy", "medium", "hard"] as const)(
  "supports a full Kids quiz at %s without widening filters",
  (difficulty) => {
    const pack = triviaPackSchema.parse(raw);
    const settings = { ...createTriviaSession().settings, count: 30, difficulty };
    const quiz = startTriviaQuiz(settings, pack.questions, {
      kidsMode: true,
      packVersion: pack.version,
    });
    expect(quiz.items).toHaveLength(30);
    expect(new Set(quiz.items.map((item) => item.question.id)).size).toBe(30);
    expect(quiz.items.every((item) => item.question.kidAppropriate)).toBe(true);
    const allowed =
      difficulty === "easy"
        ? ["easy"]
        : difficulty === "medium"
          ? ["easy", "medium"]
          : ["easy", "medium", "hard"];
    expect(quiz.items.every((item) => allowed.includes(item.question.difficulty))).toBe(true);
  },
);

it.each([10, 20, 30])(
  "balances all available difficulty tiers in a %i-question adult quiz",
  (count) => {
    const pack = triviaPackSchema.parse(raw);
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const quiz = startTriviaQuiz(
        { ...createTriviaSession().settings, count, difficulty },
        pack.questions,
        { kidsMode: false, packVersion: pack.version },
      );
      const tiers =
        difficulty === "easy"
          ? ["easy"]
          : difficulty === "medium"
            ? ["easy", "medium"]
            : ["easy", "medium", "hard"];
      const counts = tiers.map(
        (tier) => quiz.items.filter((item) => item.question.difficulty === tier).length,
      );
      expect(counts.reduce((sum, value) => sum + value, 0)).toBe(count);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    }
  },
);
