import { GAME_DEFAULTS } from "@/config/hatDefaults";
import { uniqueStaticTextListSchema } from "@/data/staticDataSchemas";
import { getCatalogueForGame, type WordPoolOptions } from "@/data/wordCatalogue";

export const hatClueSuggestionsSchema = uniqueStaticTextListSchema().refine(
  (suggestions) =>
    suggestions.every((suggestion) => suggestion.length <= GAME_DEFAULTS.maxClueLength),
  `Suggestions must be at most ${GAME_DEFAULTS.maxClueLength} characters.`,
);

export function getHatClueSuggestions(options: WordPoolOptions = {}): readonly string[] {
  const suggestions = getCatalogueForGame("hat", options).map(({ word }) => word);
  return suggestions.length === 0 ? [] : hatClueSuggestionsSchema.parse(suggestions);
}
