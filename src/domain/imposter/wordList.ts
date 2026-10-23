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
import { selectDifficultyBalanced } from "@/data/difficulty";

/** Choose a tier uniformly before its word so larger tiers do not dominate deals. */
export function chooseImposterWord(
  options: WordPoolOptions = {},
  rng: () => number = Math.random,
): string | undefined {
  return selectDifficultyBalanced(
    getCatalogueForGame("imposter", options),
    1,
    options.simpleMode ? "easy" : options.difficulty,
    rng,
  )[0]?.word;
}
