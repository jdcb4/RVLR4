import { z } from "zod";

import { addDuplicateIssues, staticTextSchema } from "@/data/staticDataSchemas";
import rawWords from "@/data/whoWhatWhereWords.json";

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

const words = whoWhatWhereWordListSchema.parse(rawWords) satisfies readonly WordEntry[];

export function getWhoWhatWhereWordList(): readonly WordEntry[] {
  return words;
}
