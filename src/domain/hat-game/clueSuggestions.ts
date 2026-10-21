import { GAME_DEFAULTS } from "@/config/hatDefaults";
import { uniqueStaticTextListSchema } from "@/data/staticDataSchemas";
import { getCatalogueForGame } from "@/data/wordCatalogue";

export const hatClueSuggestionsSchema = uniqueStaticTextListSchema().refine(
  (suggestions) =>
    suggestions.every((suggestion) => suggestion.length <= GAME_DEFAULTS.maxClueLength),
  `Suggestions must be at most ${GAME_DEFAULTS.maxClueLength} characters.`,
);

const suggestions = hatClueSuggestionsSchema.parse(
  getCatalogueForGame("hat").map(({ word }) => word),
);

export function getHatClueSuggestions(): readonly string[] {
  return suggestions;
}
