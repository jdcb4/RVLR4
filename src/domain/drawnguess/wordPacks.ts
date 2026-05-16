import { z } from "zod";

import rawPrompts from "@/data/drawnguessWordPrompts.json";

import { DRAWNGUESS_DEFAULT_WORD_PACK_ID, type DrawNGuessWordPrompt } from "./types";

const promptSchema = z.object({
  phrase: z.string().min(1).max(80),
  category: z.enum(["Kids", "Sports", "Standard"]),
  difficulty: z.enum(["Easy", "Hard"]),
});

const promptListSchema = z.array(promptSchema);

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
  const parsed = promptListSchema.parse(rawPrompts);

  return parsed.filter((prompt) => prompt.difficulty === "Easy");
}
