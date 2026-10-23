import { setActiveWordCatalogue } from "@/data/wordCatalogue";

import { loadWordsCatalogue } from "./contentPacks/store";

/** Local storage only: complete before the game picker becomes available. */
export async function initializeWordCatalogue() {
  const loaded = await loadWordsCatalogue();
  setActiveWordCatalogue(loaded.pack.entries);
  return loaded;
}
