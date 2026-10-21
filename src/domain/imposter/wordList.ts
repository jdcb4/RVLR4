import { staticTextSchema, uniqueStaticTextListSchema } from "@/data/staticDataSchemas";
import { getCatalogueForGame } from "@/data/wordCatalogue";
import { DEFAULT_IMPOSTER_THEME_ID, resolveImposterWordBank } from "@/domain/imposter/themeWords";

export const imposterWordListSchema = uniqueStaticTextListSchema(staticTextSchema.max(80));

const words = imposterWordListSchema.parse(getCatalogueForGame("imposter").map(({ word }) => word));

/**
 * Word bank for a round (JSON seed list; may grow or be split by theme later).
 */
export function getImposterWordList(): readonly string[] {
  return [...resolveImposterWordBank(DEFAULT_IMPOSTER_THEME_ID, words)];
}
