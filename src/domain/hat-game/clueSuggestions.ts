import { GAME_DEFAULTS } from "@/config/hatDefaults";
import rawClueSuggestions from "@/data/hatClueSuggestions.json";
import { uniqueStaticTextListSchema } from "@/data/staticDataSchemas";

export const hatClueSuggestionsSchema = uniqueStaticTextListSchema().refine(
  (suggestions) =>
    suggestions.every((suggestion) => suggestion.length <= GAME_DEFAULTS.maxClueLength),
  `Suggestions must be at most ${GAME_DEFAULTS.maxClueLength} characters.`,
);

const suggestions = hatClueSuggestionsSchema.parse(rawClueSuggestions);

export function getHatClueSuggestions(): readonly string[] {
  return suggestions;
}
