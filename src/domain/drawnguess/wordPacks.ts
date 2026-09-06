import { z } from "zod";

import rawPrompts from "@/data/drawnguessWordPrompts.json";
import { addDuplicateIssues, staticTextSchema } from "@/data/staticDataSchemas";

import { DRAWNGUESS_DEFAULT_WORD_PACK_ID, type DrawNGuessWordPrompt } from "./types";

const promptSchema = z
  .object({
    phrase: staticTextSchema.max(80),
    category: z.enum(["Kids", "Sports", "Standard"]),
    difficulty: z.enum(["Easy", "Hard"]),
  })
  .strict();

export const drawNGuessPromptListSchema = z
  .array(promptSchema)
  .min(1)
  .superRefine((prompts, context) => {
    addDuplicateIssues(
      prompts,
      (prompt) => `${prompt.category}:${prompt.difficulty}:${prompt.phrase}`,
      context,
      "category/difficulty/phrase combination",
    );
  });

const prompts = drawNGuessPromptListSchema.parse(rawPrompts);

export type DrawNGuessWordPack = {
  readonly id: string;
  readonly label: string;
  readonly prompts: readonly DrawNGuessWordPrompt[];
};

export function getDefaultDrawNGuessWordPack(): DrawNGuessWordPack {
  return {
    id: DRAWNGUESS_DEFAULT_WORD_PACK_ID,
    label: "Easy prompts",
    prompts: loadDrawNGuessPrompts(),
  };
}

export function loadDrawNGuessPrompts(): readonly DrawNGuessWordPrompt[] {
  return prompts.filter((prompt) => prompt.difficulty === "Easy");
}
