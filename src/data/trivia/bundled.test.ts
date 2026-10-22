import { expect, it } from "vitest";

import { createTriviaSession, startTriviaQuiz, triviaSessionSchema } from "@/domain/trivia/game";

import { triviaCategories, triviaPackSchema } from "../triviaSchema";
import raw from "./bundled.json";

it("supplies 30 unique sourced questions across every category and starts a full-length quiz", () => {
  const pack = triviaPackSchema.parse(raw);
  expect(pack.questions).toHaveLength(30);
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
