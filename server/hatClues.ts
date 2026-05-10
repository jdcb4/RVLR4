import { GAME_DEFAULTS } from "@/config/hatGameDefaults";
import clueSuggestions from "@/data/clueSuggestions.json";
import type { ClueSubmissionMap, Player } from "@/domain/hat-game/types";

/**
 * Fills the Hat clue pool without a separate clue-entry phase online — each player
 * gets random celebrity names from the suggestion list (same count as pass-and-play).
 */
export function buildServerHatClueSubmissions(
  players: Player[],
  rng: () => number,
): ClueSubmissionMap {
  const list = clueSuggestions as string[];

  const pickOne = () => {
    if (list.length === 0) {
      return "Mystery figure";
    }

    const index = Math.floor(rng() * list.length);

    return list[index] ?? "Mystery figure";
  };

  const map: ClueSubmissionMap = {};

  for (const player of players) {
    const clues: string[] = [];

    for (let index = 0; index < GAME_DEFAULTS.cluesPerPlayer; index += 1) {
      clues.push(pickOne());
    }

    map[player.id] = { clues };
  }

  return map;
}
