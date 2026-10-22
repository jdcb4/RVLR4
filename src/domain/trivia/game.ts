import { z } from "zod";

import { catalogueIdentity } from "@/data/catalogueSchema";
import type { TriviaQuestion } from "@/data/triviaSchema";
import {
  isTriviaQuestionEligible,
  triviaCategories,
  triviaQuestionSchema,
} from "@/data/triviaSchema";
import { shuffleWithRng } from "@/domain/imposter/round";

export const triviaCategoryLabels: Record<TriviaQuestion["category"], string> = {
  general: "General knowledge",
  history: "History",
  geography: "Geography",
  "science-nature": "Science & nature",
  "arts-literature": "Arts & literature",
  "film-tv": "Film & TV",
  music: "Music",
  "sport-games": "Sport & games",
};

export const triviaSettingsSchema = z
  .object({
    count: z.number().int().min(1).max(100),
    categories: z.array(z.enum(triviaCategories)).min(1).max(triviaCategories.length),
    revealMode: z.enum(["each", "end"]),
    difficulty: z.enum(["all", "easy", "medium", "hard"]),
    teams: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
  })
  .strict()
  .superRefine((settings, context) => {
    if (new Set(settings.categories).size !== settings.categories.length) {
      context.addIssue({
        code: "custom",
        path: ["categories"],
        message: "Choose each category once.",
      });
    }
  });

export type TriviaSettings = z.infer<typeof triviaSettingsSchema>;

const quizSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            question: triviaQuestionSchema,
            shownAt: z.string().datetime().nullable(),
            writtenAnswers: z.array(z.string().max(500)).min(1).max(8),
            marks: z.array(z.boolean().nullable()).min(1).max(8),
            revealed: z.boolean(),
            excluded: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    cursor: z.number().int().min(0).max(100),
    phase: z.enum(["questions", "answers", "results"]),
    settings: triviaSettingsSchema,
    kidsMode: z.boolean(),
    packVersion: z.number().int().positive().safe(),
  })
  .strict()
  .superRefine((quiz, context) => {
    const issue = (message: string) => context.addIssue({ code: "custom", message });
    if (quiz.items.length !== quiz.settings.count) issue("Question count differs from settings.");
    if (
      quiz.phase === "results"
        ? quiz.cursor !== quiz.items.length
        : quiz.cursor >= quiz.items.length
    ) {
      issue("Invalid quiz position.");
    }
    if (quiz.phase === "answers" && quiz.settings.revealMode !== "end")
      issue("Invalid answer phase.");
    const ids = new Set<string>();
    const questions = new Set<string>();
    quiz.items.forEach((item, index) => {
      const identity = catalogueIdentity(item.question.question);
      if (ids.has(item.question.id) || questions.has(identity)) issue("Repeated question.");
      ids.add(item.question.id);
      questions.add(identity);
      if (
        item.writtenAnswers.length !== quiz.settings.teams.length ||
        item.marks.length !== quiz.settings.teams.length
      ) {
        issue("Team answers and marks must match the roster.");
      }
      if (
        !quiz.settings.categories.includes(item.question.category) ||
        (quiz.kidsMode && !item.question.kidAppropriate) ||
        (quiz.settings.difficulty !== "all" &&
          item.question.difficulty !== quiz.settings.difficulty)
      ) {
        issue("Question does not match quiz settings.");
      }
      if (
        item.excluded &&
        (item.shownAt !== null ||
          item.revealed ||
          item.writtenAnswers.some(Boolean) ||
          item.marks.some((mark) => mark !== null))
      ) {
        issue("Excluded questions cannot have played state.");
      }
      if (
        item.shownAt === null &&
        (item.revealed ||
          item.writtenAnswers.some(Boolean) ||
          item.marks.some((mark) => mark !== null))
      ) {
        issue("Unshown questions cannot have answers or marks.");
      }
      if (
        item.shownAt !== null &&
        item.question.expiresAt &&
        Date.parse(item.shownAt) >= Date.parse(item.question.expiresAt)
      ) {
        issue("Question was first shown after expiry.");
      }
      if (!item.revealed && item.marks.some((mark) => mark !== null))
        issue("Marks require a revealed answer.");
      if (quiz.phase === "questions") {
        if (
          index < quiz.cursor &&
          !item.excluded &&
          (item.shownAt === null || (quiz.settings.revealMode === "each" && !item.revealed))
        )
          issue("Incomplete previous question.");
        if (index === quiz.cursor && (item.excluded || item.shownAt === null))
          issue("Current question must be prepared.");
        if (index > quiz.cursor && (item.shownAt !== null || item.excluded))
          issue("Future question already played.");
        if (quiz.settings.revealMode === "end" && item.revealed)
          issue("Answers revealed during question phase.");
      } else if (!item.excluded) {
        if (item.shownAt === null) issue("Unshown question after question phase.");
        if (item.revealed !== (quiz.phase === "results" || index <= quiz.cursor))
          issue("Invalid answer reveal order.");
      }
      if (quiz.phase === "answers" && index === quiz.cursor && item.excluded)
        issue("Cannot review an excluded question.");
    });
  });

export type TriviaQuiz = z.infer<typeof quizSchema>;

// Leave room for the native snapshot store's revision and storage envelope.
const MAX_SNAPSHOT_BYTES = 1024 * 1024 - 1024;
const snapshotSize = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;

export const triviaSessionSchema = z
  .object({
    schemaVersion: z.literal(1),
    savedAt: z.string().datetime(),
    settings: triviaSettingsSchema,
    quiz: quizSchema.nullable(),
  })
  .strict()
  .superRefine((session, context) => {
    if (
      session.quiz &&
      JSON.stringify(session.settings) !== JSON.stringify(session.quiz.settings)
    ) {
      context.addIssue({ code: "custom", message: "Session and quiz settings differ." });
    }
    if (snapshotSize(session) >= MAX_SNAPSHOT_BYTES) {
      context.addIssue({ code: "custom", message: "Trivia session exceeds the 1 MiB save limit." });
    }
  });

export type TriviaSession = z.infer<typeof triviaSessionSchema>;

export function createTriviaSession(): TriviaSession {
  return {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    settings: {
      count: 10,
      categories: [...triviaCategories],
      revealMode: "each",
      difficulty: "all",
      teams: ["Team 1", "Team 2"],
    },
    quiz: null,
  };
}

function assertSaveSize(quiz: TriviaQuiz): TriviaQuiz {
  if (
    snapshotSize({
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      settings: quiz.settings,
      quiz,
    }) >= MAX_SNAPSHOT_BYTES
  ) {
    throw new Error(
      "This quiz exceeds the 1 MiB save limit. Use fewer questions or shorter written answers.",
    );
  }
  return quiz;
}

export function startTriviaQuiz(
  input: TriviaSettings,
  questions: readonly TriviaQuestion[],
  options: { kidsMode: boolean; packVersion: number; now?: number; rng?: () => number },
): TriviaQuiz {
  const settings = triviaSettingsSchema.parse(input);
  const now = options.now ?? Date.now();
  const rng = options.rng ?? Math.random;
  const ids = new Set<string>();
  const texts = new Set<string>();
  const eligible = questions.filter((question) => {
    const identity = catalogueIdentity(question.question);
    if (
      !settings.categories.includes(question.category) ||
      !isTriviaQuestionEligible(
        question,
        { kidsMode: options.kidsMode, difficulty: settings.difficulty },
        now,
      ) ||
      ids.has(question.id) ||
      texts.has(identity)
    )
      return false;
    ids.add(question.id);
    texts.add(identity);
    return true;
  });
  if (eligible.length < settings.count)
    throw new Error(
      `Only ${String(eligible.length)} eligible questions are available; ${String(settings.count)} requested. Adjust the quiz settings or install a reviewed question pack.`,
    );
  const buckets = shuffleWithRng(settings.categories, rng).map((category) =>
    shuffleWithRng(
      eligible.filter((question) => question.category === category),
      rng,
    ),
  );
  const selected: TriviaQuestion[] = [];
  while (selected.length < settings.count) {
    for (const bucket of buckets) {
      const question = bucket.pop();
      if (question) selected.push(question);
      if (selected.length === settings.count) break;
    }
  }
  const quiz: TriviaQuiz = {
    items: selected.map((question) => ({
      question: structuredClone(question),
      shownAt: null,
      writtenAnswers: settings.teams.map(() => ""),
      marks: settings.teams.map(() => null),
      revealed: false,
      excluded: false,
    })),
    cursor: 0,
    phase: "questions",
    settings,
    kidsMode: options.kidsMode,
    packVersion: z.number().int().positive().safe().parse(options.packVersion),
  };
  return assertSaveSize(prepareTriviaQuiz(quiz, now));
}

function finishQuestions(quiz: TriviaQuiz): TriviaQuiz {
  const cursor = quiz.items.findIndex((item) => item.shownAt !== null && !item.excluded);
  if (quiz.settings.revealMode === "end" && cursor >= 0) {
    return {
      ...quiz,
      phase: "answers",
      cursor,
      items: quiz.items.map((item, index) =>
        index === cursor ? { ...item, revealed: true } : item,
      ),
    };
  }
  return { ...quiz, phase: "results", cursor: quiz.items.length };
}

/** Persist the returned state before displaying its current question. */
export function prepareTriviaQuiz(quiz: TriviaQuiz, now = Date.now()): TriviaQuiz {
  if (quiz.phase !== "questions") return quiz;
  const timestamp = new Date(now).toISOString();
  let cursor = quiz.cursor;
  const items = [...quiz.items];
  while (cursor < items.length) {
    const item = items[cursor]!;
    if (item.shownAt !== null) return cursor === quiz.cursor ? quiz : { ...quiz, cursor, items };
    if (
      !item.excluded &&
      isTriviaQuestionEligible(
        item.question,
        { kidsMode: quiz.kidsMode, difficulty: quiz.settings.difficulty },
        now,
      )
    ) {
      items[cursor] = { ...item, shownAt: timestamp };
      return assertSaveSize({ ...quiz, cursor, items });
    }
    items[cursor] = { ...item, excluded: true };
    cursor++;
  }
  return assertSaveSize(finishQuestions({ ...quiz, items, cursor }));
}

export function revealTriviaAnswer(quiz: TriviaQuiz): TriviaQuiz {
  const current = quiz.items[quiz.cursor];
  if (
    quiz.phase !== "questions" ||
    quiz.settings.revealMode !== "each" ||
    !current ||
    current.revealed
  )
    return quiz;
  return {
    ...quiz,
    items: quiz.items.map((item, index) =>
      index === quiz.cursor ? { ...item, revealed: true } : item,
    ),
  };
}

export function nextTriviaQuestion(quiz: TriviaQuiz, now = Date.now()): TriviaQuiz {
  if (quiz.phase === "results") return quiz;
  if (quiz.phase === "questions") {
    if (quiz.settings.revealMode === "each" && !quiz.items[quiz.cursor]?.revealed) return quiz;
    return prepareTriviaQuiz({ ...quiz, cursor: quiz.cursor + 1 }, now);
  }
  const cursor = quiz.items.findIndex(
    (item, index) => index > quiz.cursor && item.shownAt !== null && !item.excluded,
  );
  if (cursor < 0) return { ...quiz, phase: "results", cursor: quiz.items.length };
  return {
    ...quiz,
    cursor,
    items: quiz.items.map((item, index) => (index === cursor ? { ...item, revealed: true } : item)),
  };
}

function checkTeam(quiz: TriviaQuiz, teamIndex: number): void {
  if (!Number.isInteger(teamIndex) || teamIndex < 0 || teamIndex >= quiz.settings.teams.length)
    throw new Error("Unknown trivia team.");
}

export function setTriviaAnswer(quiz: TriviaQuiz, teamIndex: number, text: string): TriviaQuiz {
  checkTeam(quiz, teamIndex);
  const current = quiz.items[quiz.cursor];
  if (quiz.phase !== "questions" || !current || current.revealed) return quiz;
  if (text.length > 500) throw new Error("Written answers must be 500 characters or fewer.");
  return assertSaveSize({
    ...quiz,
    items: quiz.items.map((item, index) =>
      index === quiz.cursor
        ? {
            ...item,
            writtenAnswers: item.writtenAnswers.map((answer, team) =>
              team === teamIndex ? text : answer,
            ),
          }
        : item,
    ),
  });
}

export function setTriviaMark(
  quiz: TriviaQuiz,
  teamIndex: number,
  mark: boolean | null,
): TriviaQuiz {
  checkTeam(quiz, teamIndex);
  if (quiz.phase === "results" || !quiz.items[quiz.cursor]?.revealed) return quiz;
  return assertSaveSize({
    ...quiz,
    items: quiz.items.map((item, index) =>
      index === quiz.cursor
        ? { ...item, marks: item.marks.map((value, team) => (team === teamIndex ? mark : value)) }
        : item,
    ),
  });
}

export function getTriviaScores(quiz: TriviaQuiz): number[] {
  return quiz.settings.teams.map((_, team) =>
    quiz.items.reduce((score, item) => score + (item.marks[team] === true ? 1 : 0), 0),
  );
}
