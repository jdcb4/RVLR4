import rawImposterWords from "@/data/imposterWords.json";
import {
  DEFAULT_IMPOSTER_THEME_ID,
  resolveImposterWordBank,
} from "@/domain/imposter/themeWords";

/**
 * Word bank for a round (JSON seed list; may grow or be split by theme later).
 */
export function getImposterWordList(): readonly string[] {
  const list = rawImposterWords as string[];
  return [...resolveImposterWordBank(DEFAULT_IMPOSTER_THEME_ID, list)];
}
