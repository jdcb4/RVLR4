import { z } from "zod";

import type { DifficultyRating } from "@/data/difficulty";
import { addDuplicateIssues, staticTextSchema } from "@/data/staticDataSchemas";
import { getCatalogueForGame, type WordPoolOptions } from "@/data/wordCatalogue";

import { CATEGORIES, type WordEntry } from "./types";

const wordEntrySchema = z
  .object({
    word: staticTextSchema.max(80),
    category: z.enum(CATEGORIES),
    hint: staticTextSchema.max(240),
  })
  .strict();

export const whoWhatWhereWordListSchema = z
  .array(wordEntrySchema)
  .min(1)
  .superRefine((entries, context) => {
    addDuplicateIssues(
      entries,
      (entry) => `${entry.category}:${entry.word}`,
      context,
      "category/word pair",
    );
  });

export function getWhoWhatWhereWordList(
  options: WordPoolOptions = {},
): readonly (WordEntry & { readonly difficulty: DifficultyRating })[] {
  return getCatalogueForGame("www", options).map(({ word, category, hint, difficulty }) => ({
    word,
    category,
    hint,
    difficulty,
  }));
}
