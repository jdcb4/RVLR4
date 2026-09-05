import { clampImposterCount, defaultImposterCount } from "@/domain/imposter/round";
import type {
  ImposterPlayer,
  ImposterRoundState,
  ImposterSnapshot,
  ImposterStep,
} from "@/domain/imposter/types";
import {
  createImposterRevealRound,
  validateImposterSnapshotSetup,
} from "@/features/imposter/imposterRoundFlow";

export const createImposterPlayers = (
  count: number,
  previous: readonly ImposterPlayer[],
): ImposterPlayer[] =>
  Array.from({ length: count }, (_, index) => ({
    id: previous[index]?.id ?? `imposter-player-${index + 1}`,
    name: previous[index]?.name ?? `Player ${index + 1}`,
  }));

export const createInitialImposterSnapshot = (
  step: ImposterStep = "landing",
): ImposterSnapshot => ({
  step,
  playerCount: 6,
  imposterCount: defaultImposterCount(6),
  players: createImposterPlayers(6, []),
  round: null,
});

export const startImposterReveal = (
  snapshot: ImposterSnapshot,
  round: ImposterRoundState,
): ImposterSnapshot => ({ ...snapshot, step: "reveal", round });

export const showImposterRole = (snapshot: ImposterSnapshot): ImposterSnapshot =>
  snapshot.round ? { ...snapshot, round: { ...snapshot.round, revealRevealed: true } } : snapshot;

export const advanceImposterReveal = (snapshot: ImposterSnapshot): ImposterSnapshot => {
  if (!snapshot.round?.revealRevealed) return snapshot;
  if (snapshot.round.revealPlayerIndex >= snapshot.players.length - 1) {
    return { ...snapshot, step: "guidePregame" };
  }
  return {
    ...snapshot,
    round: {
      ...snapshot.round,
      revealPlayerIndex: snapshot.round.revealPlayerIndex + 1,
      revealRevealed: false,
    },
  };
};

export type ImposterTransitionResult =
  | { readonly snapshot: ImposterSnapshot; readonly error: null }
  | { readonly snapshot: null; readonly error: string };

export function resizeImposterRoster(snapshot: ImposterSnapshot, count: number): ImposterSnapshot {
  return {
    ...snapshot,
    playerCount: count,
    imposterCount: clampImposterCount(count, defaultImposterCount(count)),
    players: createImposterPlayers(count, snapshot.players),
    round: null,
  };
}

export const setImposterCount = (snapshot: ImposterSnapshot, count: number): ImposterSnapshot => ({
  ...snapshot,
  imposterCount: clampImposterCount(snapshot.playerCount, count),
  round: null,
});

export const updateImposterPlayerName = (
  snapshot: ImposterSnapshot,
  playerId: string,
  name: string,
): ImposterSnapshot => ({
  ...snapshot,
  players: snapshot.players.map((player) =>
    player.id === playerId ? { ...player, name } : player,
  ),
});

export function moveImposterSetupForward(
  snapshot: ImposterSnapshot,
  step: "roster" | "review",
): ImposterTransitionResult {
  const error = validateImposterSnapshotSetup(snapshot);
  if (error) return { snapshot: null, error };
  return {
    error: null,
    snapshot: {
      ...snapshot,
      step,
      players:
        step === "roster"
          ? createImposterPlayers(snapshot.playerCount, snapshot.players)
          : snapshot.players,
    },
  };
}

export function startImposterRound(
  snapshot: ImposterSnapshot,
  wordBank: readonly string[],
  rng: () => number,
  fallbackError: string,
  emptyWordBankError?: string,
): ImposterTransitionResult {
  const setupError = validateImposterSnapshotSetup(snapshot);
  if (setupError) return { snapshot: null, error: setupError };
  if (emptyWordBankError && wordBank.length === 0) {
    return { snapshot: null, error: emptyWordBankError };
  }
  try {
    return {
      error: null,
      snapshot: startImposterReveal(
        snapshot,
        createImposterRevealRound({ snapshot, wordBank, rng }),
      ),
    };
  } catch (error) {
    return {
      snapshot: null,
      error: error instanceof Error ? error.message : fallbackError,
    };
  }
}

export const moveImposterToStep = (
  snapshot: ImposterSnapshot,
  step: ImposterStep,
): ImposterSnapshot => ({ ...snapshot, step });

export const returnImposterToSettings = (snapshot: ImposterSnapshot): ImposterSnapshot => ({
  ...snapshot,
  step: "settings",
  round: null,
});
