import { z } from "zod";

import { catalogueIdentity } from "./catalogueSchema";
import { isDifficultyAllowed } from "./difficulty";

export const triviaCategories = [
  "general",
  "history",
  "geography",
  "science-nature",
  "arts-literature",
  "film-tv",
  "music",
  "sport-games",
] as const;

const text = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine(
      (value) => value === value.trim() && value === value.normalize("NFC"),
      "Use trimmed NFC text.",
    );

const triviaIdSchema = z.string().regex(/^trivia:[a-z0-9][a-z0-9-]{0,79}$/u);

export const triviaQuestionSchema = z
  .object({
    id: triviaIdSchema,
    revision: z.number().int().positive().safe(),
    question: text(600),
    answer: text(400),
    acceptableAnswers: z.array(text(400)).max(20),
    explanation: text(1000).optional(),
    category: z.enum(triviaCategories),
    difficulty: z.enum(["easy", "medium", "hard"]),
    kidAppropriate: z.boolean(),
    // An exclusive UTC instant. A date-only editorial input must be converted explicitly.
    expiresAt: z.string().datetime().optional(),
    review: z
      .object({
        reviewedAt: z.string().datetime(),
        reviewer: text(120),
        sources: z.array(z.string().url().max(2000)).min(1).max(10),
        sourceRecord: text(200).optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((question, context) => {
    const answers = [question.answer, ...question.acceptableAnswers].map(catalogueIdentity);
    if (new Set(answers).size !== answers.length || answers.includes("")) {
      context.addIssue({ code: "custom", message: "Duplicate or empty answer variants." });
    }
  });

export type TriviaQuestion = z.infer<typeof triviaQuestionSchema>;

export const triviaPackSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal("trivia"),
    version: z.number().int().positive().safe(),
    publishedAt: z.string().datetime(),
    questions: z.array(triviaQuestionSchema).max(20000),
    removedIds: z.array(triviaIdSchema).max(20000).default([]),
  })
  .strict()
  .superRefine((pack, context) => {
    const ids = new Set<string>();
    const texts = new Set<string>();
    pack.questions.forEach((question, index) => {
      const identity = catalogueIdentity(question.question);
      if (!identity || ids.has(question.id) || texts.has(identity)) {
        context.addIssue({
          code: "custom",
          path: ["questions", index],
          message: "Duplicate ID or question text.",
        });
      }
      ids.add(question.id);
      texts.add(identity);
    });
    if (new Set(pack.removedIds).size !== pack.removedIds.length) {
      context.addIssue({ code: "custom", path: ["removedIds"], message: "Duplicate removed ID." });
    }
    for (const id of pack.removedIds) {
      if (ids.has(id)) {
        context.addIssue({
          code: "custom",
          path: ["removedIds"],
          message: "An ID cannot be upserted and removed in the same batch.",
        });
      }
    }
  });

/** Recheck before displaying an unshown question, including after resume. */
export function isTriviaQuestionEligible(
  question: TriviaQuestion,
  options: { simpleMode: boolean; difficulty?: "all" | TriviaQuestion["difficulty"] },
  now: number = Date.now(),
): boolean {
  return (
    Number.isFinite(now) &&
    (!question.expiresAt || now < Date.parse(question.expiresAt)) &&
    isDifficultyAllowed(question.difficulty, options.simpleMode ? "easy" : options.difficulty)
  );
}
