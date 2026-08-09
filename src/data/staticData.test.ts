import { describe, expect, it } from "vitest";

import rawHatNameData from "@/data/hatNameData.json";
import rawWhoWhatWhereNamePacks from "@/data/whoWhatWhereNamePacks.json";
import { drawNGuessPromptListSchema, loadDrawNGuessPrompts } from "@/domain/drawnguess/wordPacks";
import { getHatClueSuggestions, hatClueSuggestionsSchema } from "@/domain/hat-game/clueSuggestions";
import { getHatNameData, hatNameDataSchema } from "@/domain/hat-game/nameData";
import { getImposterWordList, imposterWordListSchema } from "@/domain/imposter/wordList";
import { teamNameSetsSchema } from "@/domain/whowhatwhere/teamNames";
import {
  getWhoWhatWhereWordList,
  whoWhatWhereWordListSchema,
} from "@/domain/whowhatwhere/wordList";
import { getMultiplayerDisplayNames } from "@/multiplayer/displayNames";

import { uniqueStaticTextListSchema } from "./staticDataSchemas";

describe("static game data", () => {
  it("preserves the migrated data inventory", () => {
    const whoWhatWhereWords = getWhoWhatWhereWordList();
    const counts = Object.fromEntries(
      ["What", "Who", "Where"].map((category) => [
        category,
        whoWhatWhereWords.filter((entry) => entry.category === category).length,
      ]),
    );

    expect(whoWhatWhereWords).toHaveLength(3_129);
    expect(counts).toEqual({ What: 844, Who: 908, Where: 1_377 });
    expect(getHatClueSuggestions()).toHaveLength(1_018);
    expect(loadDrawNGuessPrompts()).toHaveLength(300);
    expect(getImposterWordList()).toHaveLength(12);
    expect(getMultiplayerDisplayNames()).toHaveLength(60);
    expect(getHatNameData()).toMatchObject({
      packs: expect.arrayContaining([expect.objectContaining({ playerNames: expect.any(Array) })]),
      fallbackNames: expect.any(Array),
    });
    expect(getHatNameData().packs).toHaveLength(6);
    expect(getHatNameData().packs.every((pack) => pack.playerNames.length === 6)).toBe(true);
    expect(getHatNameData().fallbackNames).toHaveLength(12);
    const whoWhatWhereNamePacks = teamNameSetsSchema.parse(rawWhoWhatWhereNamePacks);
    expect(whoWhatWhereNamePacks).toHaveLength(10);
    expect(whoWhatWhereNamePacks.every((pack) => pack.members.length === 12)).toBe(true);
  });

  it("rejects blank and case-insensitive duplicate strings", () => {
    const schema = uniqueStaticTextListSchema();

    expect(schema.safeParse(["Alpha", " alpha "]).success).toBe(false);
    expect(schema.safeParse(["Alpha", " "]).success).toBe(false);
  });

  it("rejects invalid or duplicate Who What Where entries", () => {
    expect(
      whoWhatWhereWordListSchema.safeParse([
        { word: "Example", category: "How", hint: "Not a valid category" },
      ]).success,
    ).toBe(false);
    expect(
      whoWhatWhereWordListSchema.safeParse([
        { word: "Example", category: "What", hint: "First" },
        { word: "example", category: "What", hint: "Second" },
      ]).success,
    ).toBe(false);
  });

  it("validates each structured shipped asset", () => {
    expect(hatNameDataSchema.safeParse(rawHatNameData).success).toBe(true);
    expect(hatClueSuggestionsSchema.safeParse(["Ada Lovelace", "ada lovelace"]).success).toBe(
      false,
    );
    expect(imposterWordListSchema.safeParse(["Library", "library"]).success).toBe(false);
    expect(
      drawNGuessPromptListSchema.safeParse([
        { phrase: "Apple", category: "Standard", difficulty: "Easy" },
        { phrase: "apple", category: "Standard", difficulty: "Easy" },
      ]).success,
    ).toBe(false);
  });
});
