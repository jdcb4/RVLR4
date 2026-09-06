import rawImposterWords from "@/data/imposterWords.json";
import { staticTextSchema, uniqueStaticTextListSchema } from "@/data/staticDataSchemas";
import { DEFAULT_IMPOSTER_THEME_ID, resolveImposterWordBank } from "@/domain/imposter/themeWords";

export const imposterWordListSchema = uniqueStaticTextListSchema(staticTextSchema.max(80));

const words = imposterWordListSchema.parse(rawImposterWords);

/**
 * Word bank for a round (JSON seed list; may grow or be split by theme later).
 */
export function getImposterWordList(): readonly string[] {
  return [...resolveImposterWordBank(DEFAULT_IMPOSTER_THEME_ID, words)];
}
