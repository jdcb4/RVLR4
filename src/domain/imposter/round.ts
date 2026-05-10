import {
  IMPOSTER_MAX_PLAYERS,
  IMPOSTER_MIN_PLAYERS,
} from "@/config/imposterDefaults";

/** Fisher–Yates shuffle using the supplied RNG (0 inclusive, 1 exclusive). */
export function shuffleWithRng<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j]!;
    copy[j] = tmp!;
  }
  return copy;
}

/**
 * Maximum imposters allowed so there is always at least one regular player and play stays balanced.
 * Caps at 2 imposters even for very large groups (product rule).
 */
export function maxImpostersForPlayers(playerCount: number): number {
  if (playerCount < IMPOSTER_MIN_PLAYERS) {
    return 1;
  }
  const fromFormula = Math.floor((playerCount - 1) / 2);
  return Math.min(2, Math.max(1, fromFormula));
}

/** Suggested imposter count when player count changes (user may override within bounds). */
export function defaultImposterCount(playerCount: number): number {
  return playerCount >= 7 ? 2 : 1;
}

/** Clamp user-chosen imposter count to valid range for this player count. */
export function clampImposterCount(
  playerCount: number,
  requested: number,
): number {
  const max = maxImpostersForPlayers(playerCount);
  return Math.min(max, Math.max(1, Math.trunc(requested)));
}

export type DealResult = {
  readonly secretWord: string;
  readonly imposterPlayerIds: readonly string[];
};

/**
 * Picks a secret word and imposter seats. Caller validates counts before calling.
 */
export function dealImposterRound(args: {
  readonly playerIds: readonly string[];
  readonly imposterCount: number;
  readonly wordBank: readonly string[];
  readonly rng: () => number;
}): DealResult {
  const { playerIds, imposterCount, wordBank, rng } = args;
  if (wordBank.length === 0) {
    throw new Error("Imposter: word bank is empty.");
  }
  if (playerIds.length === 0) {
    throw new Error("Imposter: no players.");
  }
  if (imposterCount < 1 || imposterCount > playerIds.length - 1) {
    throw new Error("Imposter: invalid imposter count for roster.");
  }
  const cap = maxImpostersForPlayers(playerIds.length);
  if (imposterCount > cap) {
    throw new Error("Imposter: imposter count exceeds cap for this group.");
  }

  const secretWord =
    wordBank[Math.floor(rng() * wordBank.length)] ?? wordBank[0]!;
  const order = shuffleWithRng(playerIds, rng);
  const imposterPlayerIds = order.slice(0, imposterCount);
  return { secretWord, imposterPlayerIds };
}

/** Validates setup before dealing or persisting. */
export function getImposterSetupError(args: {
  readonly playerCount: number;
  readonly imposterCount: number;
  readonly playerNames: readonly string[];
}): string | null {
  const { playerCount, imposterCount, playerNames } = args;
  if (
    playerCount < IMPOSTER_MIN_PLAYERS ||
    playerCount > IMPOSTER_MAX_PLAYERS
  ) {
    return `Choose ${IMPOSTER_MIN_PLAYERS}–${IMPOSTER_MAX_PLAYERS} players.`;
  }
  if (playerNames.length !== playerCount) {
    return "Player list does not match the selected player count.";
  }
  const max = maxImpostersForPlayers(playerCount);
  if (imposterCount < 1 || imposterCount > max) {
    return `Use 1–${String(max)} imposters for this group size.`;
  }
  for (const name of playerNames) {
    if (name.trim().length === 0) {
      return "Every player needs a name.";
    }
  }
  return null;
}
