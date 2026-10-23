import { expect, it } from "vitest";

import { createTriviaSession, startTriviaQuiz, triviaSessionSchema } from "@/domain/trivia/game";

import pack4History from "../../../content/trivia/expansion-v4/history-arts.json";
import pack4Science from "../../../content/trivia/expansion-v4/science-places.json";
import pack4Screen from "../../../content/trivia/expansion-v4/screen-music-sport.json";
import historyArts from "../../../content/trivia/history-arts.json";
import original from "../../../content/trivia/original-pack-v2.json";
import sciencePlaces from "../../../content/trivia/science-places.json";
import screenMusicSport from "../../../content/trivia/screen-music-sport.json";
import { triviaCategories, triviaPackSchema } from "../triviaSchema";
import raw from "./bundled.json";

it("supplies 600 unique sourced questions across every category and starts a full-length quiz", () => {
  const pack = triviaPackSchema.parse(raw);
  expect(pack.questions).toHaveLength(600);
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

it("preserves the previous 150 records and their original expansion coverage", () => {
  const pack = triviaPackSchema.parse(raw);
  const ids = new Set(original.questions.map((question) => question.id));
  expect(pack.questions.filter((question) => ids.has(question.id))).toEqual(original.questions);
  const additions = [...historyArts, ...sciencePlaces, ...screenMusicSport];
  const previous = [...original.questions, ...additions];
  const previousIds = new Set(previous.map((question) => question.id));
  expect(pack.questions.filter((question) => previousIds.has(question.id))).toEqual(previous);
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

it("adds 150 fresh records with balanced tiers and category coverage", () => {
  const pack = triviaPackSchema.parse(raw);
  const previousIds = new Set(
    [...original.questions, ...historyArts, ...sciencePlaces, ...screenMusicSport].map((q) => q.id),
  );
  const additions = [...pack4History, ...pack4Science, ...pack4Screen];
  expect(pack.questions.filter((q) => additions.some((entry) => entry.id === q.id))).toEqual(
    additions,
  );
  expect(additions.every((q) => !previousIds.has(q.id))).toBe(true);
  expect(additions).toHaveLength(150);
  for (const difficulty of ["easy", "medium", "hard"]) {
    expect(additions.filter((q) => q.difficulty === difficulty)).toHaveLength(50);
  }
  for (const category of triviaCategories) {
    const entries = additions.filter((q) => q.category === category);
    expect(entries).toHaveLength(category === "music" || category === "sport-games" ? 18 : 19);
    expect(
      entries.filter((q) => q.kidAppropriate && q.difficulty === "easy").length,
    ).toBeGreaterThanOrEqual(4);
    expect(entries.filter((q) => q.kidAppropriate).length).toBeGreaterThanOrEqual(5);
    for (const difficulty of ["easy", "medium", "hard"]) {
      expect(entries.filter((q) => q.difficulty === difficulty).length).toBeGreaterThanOrEqual(6);
    }
  }
});

it("preserves all 300 prior records and adds 100 questions per tier with broad Kids coverage", () => {
  const pack = triviaPackSchema.parse(raw);
  const previous = [
    ...original.questions,
    ...historyArts,
    ...sciencePlaces,
    ...screenMusicSport,
    ...pack4History,
    ...pack4Science,
    ...pack4Screen,
  ];
  const previousIds = new Set(previous.map((q) => q.id));
  expect(pack.questions.filter((q) => previousIds.has(q.id))).toEqual(previous);
  const additions = pack.questions.filter((q) => !previousIds.has(q.id));
  expect(additions).toHaveLength(300);
  for (const difficulty of ["easy", "medium", "hard"]) {
    expect(additions.filter((q) => q.difficulty === difficulty)).toHaveLength(100);
  }
  for (const category of triviaCategories) {
    const entries = additions.filter((q) => q.category === category);
    expect(entries.length).toBeGreaterThanOrEqual(37);
    expect(entries.length).toBeLessThanOrEqual(38);
    expect(
      entries.filter((q) => q.kidAppropriate && q.difficulty === "easy").length,
    ).toBeGreaterThanOrEqual(8);
    expect(entries.filter((q) => q.kidAppropriate).length).toBeGreaterThanOrEqual(10);
  }
});
