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
  allWords: readonly WordEntry[],
  settings: GameSettings,
  random = Math.random,
): TurnDeck {
  const availableCategories = settings.selectedCategories.filter((category) =>
    allWords.some((word) => word.category === category),
  );
  const category = chooseWeightedCategory(availableCategories, random);
  const matchingWords = allWords.filter((word) => word.category === category);

  if (matchingWords.length === 0) {
    throw new Error(`No words available for ${category}.`);
  }

  const shuffled = shuffleWords(matchingWords, random).slice(0, 90);

  return {
    category,
    words: shuffled.slice(0, 30),
    reserveWords: shuffled.slice(30, 90),
  };
}

function shuffleWords(words: readonly WordEntry[], random: () => number) {
  const shuffled = [...words];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }

  return shuffled;
}
