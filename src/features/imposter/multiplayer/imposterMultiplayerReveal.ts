import type {
  ImposterPlayer,
  ImposterRoundState,
} from "@/features/imposter/imposterSingleplayerAppTypes";

export type ParallelRevealProgress = {
  readonly seen: boolean;
  readonly done: boolean;
};

export function getParallelRevealProgress(
  round: ImposterRoundState,
  viewerPlayerId: string,
): ParallelRevealProgress | null {
  if (round.parallelRoleSeen === undefined || round.parallelRevealDone === undefined) {
    return null;
  }

  return {
    seen: round.parallelRoleSeen[viewerPlayerId] === true,
    done: round.parallelRevealDone[viewerPlayerId] === true,
  };
}

export function imposterPlayerName(
  players: readonly ImposterPlayer[],
  playerId: string,
  fallback = "Player",
) {
  return players.find((player) => player.id === playerId)?.name ?? fallback;
}

export function imposterPlayerOrdinal(players: readonly ImposterPlayer[], playerId: string) {
  return players.findIndex((player) => player.id === playerId) + 1;
}
