import kids from "./catalogue/kids.json";
import what from "./catalogue/what.json";
import where from "./catalogue/where.json";
import who from "./catalogue/who.json";
import { type CatalogueEntry, type CatalogueGame, catalogueSchema } from "./catalogueSchema";
import { isDifficultyAllowed } from "./difficulty";

function immutableCatalogue(entries: unknown): readonly CatalogueEntry[] {
  const validated = catalogueSchema.parse(entries);
  for (const entry of validated) {
    Object.freeze(entry.aliases);
    Object.freeze(entry.originalIds);
    Object.freeze(entry.games);
    Object.freeze(entry);
  }
  return Object.freeze(validated);
}

const catalogue = immutableCatalogue([...who, ...what, ...where, ...kids]);
let activeCatalogue = catalogue;

/** Metadata stays outside version-1 saved game payloads. */
export function getWordCatalogue(): readonly CatalogueEntry[] {
  return catalogue;
}

/** Publish a complete validated pool after the installed pack has committed. */
export function setActiveWordCatalogue(entries: readonly CatalogueEntry[]): void {
  activeCatalogue = immutableCatalogue(entries);
}

export type WordPoolOptions = {
  difficulty?: "all" | "easy" | "medium" | "hard";
  kidsMode?: boolean;
};

export function getCatalogueForGame(
  game: CatalogueGame,
  options: WordPoolOptions = {},
): readonly CatalogueEntry[] {
  return activeCatalogue.filter(
    (entry) =>
      entry.games.includes(game) &&
      (!options.kidsMode || entry.kidAppropriate) &&
      isDifficultyAllowed(entry.difficulty, options.difficulty),
  );
}
