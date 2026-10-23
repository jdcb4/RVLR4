import type { Category, GameSettings, WordEntry } from "./types";

const CATEGORY_WEIGHTS: Record<Category, number> = {
  What: 2,
  Who: 1,
  Where: 1,
};

type TurnDeck = {
  readonly category: Category;
  readonly words: readonly WordEntry[];
  readonly reserveWords: readonly WordEntry[];
};

export function chooseWeightedCategory(
  selectedCategories: readonly Category[],
  random = Math.random,
): Category {
  const categories = selectedCategories;
  if (categories.length === 0) {
    throw new Error(
      "No words match these categories and word settings. Change the difficulty or categories.",
    );
  }
  const totalWeight = categories.reduce((total, category) => total + CATEGORY_WEIGHTS[category], 0);
  let threshold = random() * totalWeight;

  for (const category of categories) {
    threshold -= CATEGORY_WEIGHTS[category];
    if (threshold < 0) {
      return category;
    }
  }

  return categories[categories.length - 1] ?? "What";
}

export function buildTurnDeck(
  allWords: readonly (WordEntry & { readonly difficulty?: DifficultyRating })[],
  settings: GameSettings,
  random = Math.random,
): TurnDeck {
  const eligibleWords = allWords.filter((word) =>
    isDifficultyAllowed(
      word.difficulty ?? "easy",
      settings.simpleMode ? "easy" : settings.wordDifficulty,
    ),
  );
  const availableCategories = settings.selectedCategories.filter((category) =>
    eligibleWords.some((word) => word.category === category),
  );
  const category = chooseWeightedCategory(availableCategories, random);
  const matchingWords = eligibleWords.filter((word) => word.category === category);

  if (matchingWords.length === 0) {
    throw new Error(`No words available for ${category}.`);
  }

  const selected = selectDifficultyBalanced(
    matchingWords.map((word) => ({ ...word, difficulty: word.difficulty ?? "easy" })),
    90,
    settings.simpleMode ? "easy" : settings.wordDifficulty,
    random,
  ).map(({ word, category, hint }) => ({ word, category, hint }));

  return {
    category,
    words: selected.slice(0, 30),
    reserveWords: selected.slice(30, 90),
  };
}
import {
  type DifficultyRating,
  isDifficultyAllowed,
  selectDifficultyBalanced,
} from "@/data/difficulty";
