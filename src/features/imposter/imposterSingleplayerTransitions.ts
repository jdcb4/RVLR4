import { defaultImposterCount } from "@/domain/imposter/round";
import type {
  ImposterPlayer,
  ImposterRoundState,
  ImposterSnapshot,
  ImposterStep,
} from "@/features/imposter/imposterSingleplayerAppTypes";

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
