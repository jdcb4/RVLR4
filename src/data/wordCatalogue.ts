import kids from "./catalogue/kids.json";
import what from "./catalogue/what.json";
import where from "./catalogue/where.json";
import who from "./catalogue/who.json";
import { type CatalogueEntry, type CatalogueGame, catalogueSchema } from "./catalogueSchema";

const catalogue = catalogueSchema.parse([...who, ...what, ...where, ...kids]);

/** Metadata stays outside version-1 saved game payloads. */
export function getWordCatalogue(): readonly CatalogueEntry[] {
  return catalogue;
}

export function getCatalogueForGame(game: CatalogueGame): readonly CatalogueEntry[] {
  return catalogue.filter((entry) => entry.games.includes(game));
}
