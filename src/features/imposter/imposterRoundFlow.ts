import { dealImposterRound, getImposterSetupError } from "@/domain/imposter/round";
import type { ImposterRoundState, ImposterSnapshot } from "@/domain/imposter/types";

export function validateImposterSnapshotSetup(snapshot: ImposterSnapshot): string | null {
  return getImposterSetupError({
    playerCount: snapshot.playerCount,
    imposterCount: snapshot.imposterCount,
    playerNames: snapshot.players.map((player) => player.name),
  });
}

export function createImposterRevealRound({
  snapshot,
  wordBank,
  rng,
}: {
  readonly snapshot: ImposterSnapshot;
  readonly wordBank: readonly string[];
  readonly rng: () => number;
}): ImposterRoundState {
  const deal = dealImposterRound({
    playerIds: snapshot.players.map((player) => player.id),
    imposterCount: snapshot.imposterCount,
    wordBank,
    rng,
  });

  return {
    secretWord: deal.secretWord,
    imposterPlayerIds: [...deal.imposterPlayerIds],
    revealPlayerIndex: 0,
    revealRevealed: false,
  };
}
