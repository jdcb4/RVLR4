import { GAME_DEFAULTS } from "@/config/hatDefaults";
import clueSuggestions from "@/data/clueSuggestions.json";
import type { ClueSubmissionMap, Player } from "@/domain/hat-game/types";

/**
 * Builds Hat clue pools from lobby drafts — each player must have filled six figures.
 */
export function buildHatClueSubmissionsFromLobby(
  players: Player[],
  drafts: Record<string, string[]> | undefined,
): ClueSubmissionMap {
  const map: ClueSubmissionMap = {};

  for (const player of players) {
    const row = drafts?.[player.id];
    const clues =
      row ??
      Array.from({ length: GAME_DEFAULTS.cluesPerPlayer }, () => "");

    if (
      clues.length !== GAME_DEFAULTS.cluesPerPlayer ||
      clues.some((clue) => clue.trim().length === 0)
    ) {
      throw new Error(
        `Everyone must enter ${GAME_DEFAULTS.cluesPerPlayer} famous figures before starting.`,
      );
    }

    map[player.id] = {
      clues: clues.map((clue) => clue.trim().slice(0, GAME_DEFAULTS.maxClueLength)),
    };
  }

  return map;
}

/**
 * @deprecated Online matches use `buildHatClueSubmissionsFromLobby`; solo quick-fill only.
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

/** Random unused celebrity suggestion for lightning-fill (Hat lobby). */
export function pickSuggestedHatClue(
  drafts: Record<string, string[]>,
  rng: () => number,
): string {
  const list = clueSuggestions as string[];
  const used = new Set(
    Object.values(drafts).flatMap((row) =>
      row.map((entry) => entry.trim()).filter(Boolean),
    ),
  );
  const candidates = list.filter((entry) => !used.has(entry));
  const pool = candidates.length > 0 ? candidates : list;

  return pool[Math.floor(rng() * pool.length)] ?? "Mystery figure";
}
