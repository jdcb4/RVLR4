import { staticTextSchema, uniqueStaticTextListSchema } from "@/data/staticDataSchemas";
import { getCatalogueForGame, type WordPoolOptions } from "@/data/wordCatalogue";

export const imposterWordListSchema = uniqueStaticTextListSchema(staticTextSchema.max(80));

/**
 * New rounds use the requested catalogue pool; an empty pool stays empty.
 */
export function getImposterWordList(options: WordPoolOptions = {}): readonly string[] {
  const words = getCatalogueForGame("imposter", options).map(({ word }) => word);
  return words.length ? imposterWordListSchema.parse(words) : [];
}
