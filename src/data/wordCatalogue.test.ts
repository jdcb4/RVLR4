import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { getHatClueSuggestions } from "@/domain/hat-game/clueSuggestions";
import { getImposterWordList } from "@/domain/imposter/wordList";
import { getWhoWhatWhereWordList } from "@/domain/whowhatwhere/wordList";

import { type CatalogueEntry, catalogueIdentity, catalogueSchema } from "./catalogueSchema";
import originalHat from "./hatClueSuggestions.json";
import originalImposter from "./imposterWords.json";
import originalWww from "./whoWhatWhereWords.json";
import { getCatalogueForGame, getWordCatalogue } from "./wordCatalogue";

const sample: CatalogueEntry = {
  word: "Beyoncé",
  category: "Who",
  hint: "Singer formerly in Destiny's Child",
  difficulty: "easy",
  kidAppropriate: false,
  aliases: ["Beyonce Knowles"],
  originalIds: ["hat:0"],
  games: ["hat", "www"],
};

describe("curated word catalogue", () => {
  it("preserves the exact original inventories independently of display corrections", () => {
    for (const [data, hash] of [
      [originalWww, "b71b21780c9ba2bd92bbf095e1f4424f9a466a0532234bf17e5c108930c2c17a"],
      [originalHat, "02229d433c0bcb00cade005fada4056d77335ffe4e4d5ee5ace35c499e3af5ce"],
      [originalImposter, "3be2d5c6f70533a2d6028ced17a66e29826a424fc1ef05b23ca5b14da115f863"],
    ] as const) {
      expect(createHash("sha256").update(JSON.stringify(data)).digest("hex")).toBe(hash);
    }
  });

  it("accounts for every original answer exactly once, including merged aliases", () => {
    const catalogue = getWordCatalogue();
    const sourceNames = new Map<string, string>([
      ...originalWww.map(({ word }, index) => [`www:${index}`, word] as const),
      ...originalHat.map((word, index) => [`hat:${index}`, word] as const),
      ...originalImposter.map((word, index) => [`imposter:${index}`, word] as const),
    ]);
    const seen = new Set<string>();
    for (const entry of catalogue) {
      // Ambiguous originals can gain a qualifier without becoming shared aliases.
      const unqualifiedWord = entry.word.replace(/ \([^)]*\)$/u, "");
      const identities = [entry.word, unqualifiedWord, ...entry.aliases].map(catalogueIdentity);
      for (const id of entry.originalIds) {
        expect(seen.has(id), `Repeated source ${id}`).toBe(false);
        seen.add(id);
        const original = sourceNames.get(id);
        expect(original, `Unknown source ${id}`).toBeDefined();
        expect(identities, `${entry.word} lost the alias for ${original}`).toContain(
          catalogueIdentity(original!),
        );
        expect(entry.games).toContain(id.split(":")[0]);
      }
    }
    expect([...seen].sort()).toEqual([...sourceNames.keys()].sort());
  });

  it("ships fully rated, duplicate-free content with a substantial kids supplement", () => {
    const catalogue = getWordCatalogue();
    expect(catalogueSchema.safeParse(catalogue).success).toBe(true);
    const additions = catalogue.filter((entry) => entry.originalIds.length === 0);
    expect(additions.length).toBeGreaterThanOrEqual(500);
    expect(additions.filter((entry) => entry.kidAppropriate).length).toBeGreaterThanOrEqual(200);
    for (const difficulty of ["easy", "medium", "hard"]) {
      expect(catalogue.some((entry) => entry.difficulty === difficulty)).toBe(true);
    }
  });

  it("projects only legacy payload fields into every game", () => {
    expect(getWhoWhatWhereWordList()).toEqual(
      getCatalogueForGame("www").map(({ word, category, hint }) => ({ word, category, hint })),
    );
    expect(getHatClueSuggestions()).toEqual(getCatalogueForGame("hat").map(({ word }) => word));
    expect(getImposterWordList()).toEqual(getCatalogueForGame("imposter").map(({ word }) => word));
  });

  it("merges alternate names while preserving distinct homonyms and child suitability", () => {
    const catalogue = getWordCatalogue();
    const named = (word: string) => catalogue.find((entry) => entry.word === word);
    expect(named("Uluru")?.aliases).toContain("Ayers Rock");
    expect(named("Ayers Rock")).toBeUndefined();
    expect(named("Oasis (band)")).toMatchObject({
      category: "Who",
      originalIds: expect.arrayContaining(["www:2965"]),
    });
    expect(named("Oasis (desert)")).toMatchObject({
      category: "What",
      originalIds: expect.arrayContaining(["www:101"]),
    });
    expect(named("Champagne (drink)")?.kidAppropriate).toBe(false);
    expect(named("Winery")?.kidAppropriate).toBe(false);
    expect(named("Playground")?.kidAppropriate).toBe(true);
    expect(named("Taylor Swift")?.difficulty).toBe("easy");
    expect(named("Albert Einstein")?.difficulty).toBe("easy");
    expect(named("Srinivasa Ramanujan")?.kidAppropriate).toBe(false);
  });

  it("rejects alternative-name collisions, invalid metadata and reused provenance", () => {
    expect(catalogueIdentity("Spider-Man")).toBe(catalogueIdentity(" spider man "));
    expect(catalogueIdentity("Beyoncé")).toBe(catalogueIdentity("Beyonce"));
    expect(
      catalogueSchema.safeParse([
        sample,
        { ...sample, word: "Beyonce Knowles", aliases: [], originalIds: [] },
      ]).success,
    ).toBe(false);
    expect(catalogueSchema.safeParse([{ ...sample, difficulty: "expert" }]).success).toBe(false);
    expect(catalogueSchema.safeParse([{ ...sample, kidAppropriate: "yes" }]).success).toBe(false);
    expect(catalogueSchema.safeParse([{ ...sample, hint: "" }]).success).toBe(false);
    expect(
      catalogueSchema.safeParse([sample, { ...sample, word: "Another", aliases: [] }]).success,
    ).toBe(false);
  });
});
