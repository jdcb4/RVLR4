import { z } from "zod";

import { catalogueIdentity } from "@/data/catalogueSchema";
import { isDifficultyAllowed, selectDifficultyBalanced } from "@/data/difficulty";
import type { TriviaQuestion } from "@/data/triviaSchema";
import {
  isTriviaQuestionEligible,
  triviaCategories,
  triviaQuestionSchema,
} from "@/data/triviaSchema";

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
            writtenAnswer: z.string().max(500),
            revealed: z.boolean(),
            excluded: z.boolean(),
            mark: z.boolean().nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    cursor: z.number().int().min(0).max(100),
    phase: z.enum(["questions", "ready", "answers", "results"]),
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
    if ((quiz.phase === "ready" || quiz.phase === "answers") && quiz.settings.revealMode !== "end")
      issue("Invalid answer phase.");
    if (
      quiz.phase === "ready" &&
      quiz.cursor !== quiz.items.findIndex((item) => item.shownAt !== null && !item.excluded)
    )
      issue("Answer review must start at the first played question.");
    const ids = new Set<string>();
    const questions = new Set<string>();
    quiz.items.forEach((item, index) => {
      const identity = catalogueIdentity(item.question.question);
      if (ids.has(item.question.id) || questions.has(identity)) issue("Repeated question.");
      ids.add(item.question.id);
      questions.add(identity);
      if (
        !quiz.settings.categories.includes(item.question.category) ||
        (quiz.kidsMode && !item.question.kidAppropriate) ||
        !isDifficultyAllowed(item.question.difficulty, quiz.settings.difficulty)
      ) {
        issue("Question does not match quiz settings.");
      }
      if (
        item.excluded &&
        (item.shownAt !== null || item.revealed || item.writtenAnswer !== "" || item.mark !== null)
      ) {
        issue("Excluded questions cannot have played state.");
      }
      if (
        item.shownAt === null &&
        (item.revealed || item.writtenAnswer !== "" || item.mark !== null)
      ) {
        issue("Unshown questions cannot have answers.");
      }
      if (!item.revealed && item.mark !== null) issue("Unrevealed answers cannot be marked.");
      if (quiz.settings.revealMode === "each" && item.writtenAnswer !== "")
        issue("Written answers are only available in end mode.");
      if (
        item.shownAt !== null &&
        item.question.expiresAt &&
        Date.parse(item.shownAt) >= Date.parse(item.question.expiresAt)
      ) {
        issue("Question was first shown after expiry.");
      }
      if (quiz.phase === "questions") {
        if (
          index < quiz.cursor &&
          !item.excluded &&
          (item.shownAt === null ||
            (quiz.settings.revealMode === "each" && (!item.revealed || item.mark === null)))
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
        if (quiz.phase === "ready") {
          if (item.revealed || item.mark !== null)
            issue("Answers cannot be revealed or marked before starting review.");
        } else if (item.revealed !== (quiz.phase === "results" || index <= quiz.cursor))
          issue("Invalid answer reveal order.");
        if ((quiz.phase === "results" || index < quiz.cursor) && item.mark === null)
          issue("Reviewed answers must be marked.");
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
    schemaVersion: z.literal(3),
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
    schemaVersion: 3,
    savedAt: new Date().toISOString(),
    settings: {
      count: 10,
      categories: [...triviaCategories],
      revealMode: "each",
      difficulty: "hard",
    },
    quiz: null,
  };
}

function assertSaveSize(quiz: TriviaQuiz): TriviaQuiz {
  if (
    snapshotSize({
      schemaVersion: 3,
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
  const selected = selectDifficultyBalanced(
    eligible,
    settings.count,
    settings.difficulty,
    rng,
    (question) => question.category,
  );
  const quiz: TriviaQuiz = {
    items: selected.map((question) => ({
      question: structuredClone(question),
      shownAt: null,
      writtenAnswer: "",
      revealed: false,
      excluded: false,
      mark: null,
    })),
    cursor: 0,
    phase: "questions",
    settings,
    kidsMode: options.kidsMode,
    packVersion: z.number().int().positive().safe().parse(options.packVersion),
  };
  return assertSaveSize(prepareTriviaQuiz(quiz, now));
}

function revealWrittenAnswer(item: TriviaQuiz["items"][number]): TriviaQuiz["items"][number] {
  const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");
  const answer = normalize(item.writtenAnswer);
  const matches =
    answer !== "" &&
    [item.question.answer, ...item.question.acceptableAnswers].some(
      (candidate) => normalize(candidate) === answer,
    );
  return { ...item, revealed: true, mark: matches ? true : null };
}

function finishQuestions(quiz: TriviaQuiz): TriviaQuiz {
  const cursor = quiz.items.findIndex((item) => item.shownAt !== null && !item.excluded);
  if (quiz.settings.revealMode === "end" && cursor >= 0) {
    return { ...quiz, phase: "ready", cursor };
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

export function startTriviaAnswers(quiz: TriviaQuiz): TriviaQuiz {
  if (quiz.phase !== "ready" || quiz.settings.revealMode !== "end") return quiz;
  return {
    ...quiz,
    phase: "answers",
    items: quiz.items.map((item, index) =>
      index === quiz.cursor ? revealWrittenAnswer(item) : item,
    ),
  };
}

export function nextTriviaQuestion(quiz: TriviaQuiz, now = Date.now()): TriviaQuiz {
  if (quiz.phase === "ready" || quiz.phase === "results") return quiz;
  const current = quiz.items[quiz.cursor];
  if (quiz.phase === "questions") {
    if (quiz.settings.revealMode === "each" && (!current?.revealed || current.mark === null))
      return quiz;
    return prepareTriviaQuiz({ ...quiz, cursor: quiz.cursor + 1 }, now);
  }
  if (!current?.revealed || current.mark === null) return quiz;
  const cursor = quiz.items.findIndex(
    (item, index) => index > quiz.cursor && item.shownAt !== null && !item.excluded,
  );
  if (cursor < 0) return { ...quiz, phase: "results", cursor: quiz.items.length };
  return {
    ...quiz,
    cursor,
    items: quiz.items.map((item, index) => (index === cursor ? revealWrittenAnswer(item) : item)),
  };
}

export function setTriviaAnswer(quiz: TriviaQuiz, text: string): TriviaQuiz {
  const current = quiz.items[quiz.cursor];
  if (
    quiz.phase !== "questions" ||
    quiz.settings.revealMode !== "end" ||
    !current ||
    current.revealed
  )
    return quiz;
  if (text.length > 500) throw new Error("Written answers must be 500 characters or fewer.");
  return assertSaveSize({
    ...quiz,
    items: quiz.items.map((item, index) =>
      index === quiz.cursor ? { ...item, writtenAnswer: text } : item,
    ),
  });
}

export function setTriviaMark(quiz: TriviaQuiz, mark: boolean): TriviaQuiz {
  const current = quiz.items[quiz.cursor];
  if (
    quiz.phase === "results" ||
    !current?.revealed ||
    current.shownAt === null ||
    current.excluded
  )
    return quiz;
  return {
    ...quiz,
    items: quiz.items.map((item, index) => (index === quiz.cursor ? { ...item, mark } : item)),
  };
}
