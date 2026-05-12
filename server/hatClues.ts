import { GAME_DEFAULTS } from "@/config/hatDefaults";
import clueSuggestions from "@/data/clueSuggestions.json";
import type { ClueSubmissionMap, Player } from "@/domain/hat-game/types";

import type { Room } from "./roomStore.ts";

/**
 * Validates a Hat clue-cell edit (used by `lobby:hatSetClueCell` and
 * `lobby:hatSuggestClue`). Asserts the lobby is in the right phase, parses
 * and bounds-checks the clue index, and returns the actor's current draft
 * row (a fresh empty one if they haven't written anything yet).
 *
 * Mutates `room.hatClueDrafts` to ensure the bag exists. Caller writes the
 * new value into the returned `row` and assigns it back.
 */
export function loadHatClueDraftSlot(
  room: Room,
  actorId: string,
  rawClueIndex: unknown,
): { row: string[]; clueIndex: number } {
  if (room.gameKind !== "hat" || room.phase !== "lobby") {
    throw new Error("Clues can only be edited in the Hat lobby.");
  }

  const clueIndex = Number(rawClueIndex);

  if (
    Number.isNaN(clueIndex) ||
    clueIndex < 0 ||
    clueIndex >= GAME_DEFAULTS.cluesPerPlayer
  ) {
    throw new Error("Invalid clue slot.");
  }

  room.hatClueDrafts ??= {};
  const row = [
    ...(room.hatClueDrafts[actorId] ??
      Array.from({ length: GAME_DEFAULTS.cluesPerPlayer }, () => "")),
  ];

  return { row, clueIndex };
}

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
