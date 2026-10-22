import kids from "./catalogue/kids.json";
import what from "./catalogue/what.json";
import where from "./catalogue/where.json";
import who from "./catalogue/who.json";
import { type CatalogueEntry, type CatalogueGame, catalogueSchema } from "./catalogueSchema";
import { isDifficultyAllowed } from "./difficulty";

const catalogue = catalogueSchema.parse([...who, ...what, ...where, ...kids]);

/** Metadata stays outside version-1 saved game payloads. */
export function getWordCatalogue(): readonly CatalogueEntry[] {
  return catalogue;
}

export type WordPoolOptions = {
  difficulty?: "all" | "easy" | "medium" | "hard";
  kidsMode?: boolean;
};

export function getCatalogueForGame(
  game: CatalogueGame,
  options: WordPoolOptions = {},
): readonly CatalogueEntry[] {
  return catalogue.filter(
    (entry) =>
      entry.games.includes(game) &&
      (!options.kidsMode || entry.kidAppropriate) &&
      isDifficultyAllowed(entry.difficulty, options.difficulty),
  );
}
