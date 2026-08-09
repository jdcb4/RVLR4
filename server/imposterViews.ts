import type { ImposterSnapshot } from "@/features/imposter/imposterSingleplayerAppTypes";

export type ImposterSyncDto = {
  readonly snapshot: ImposterSnapshot;
  /** Sequential reveal: active subject. Parallel reveal: viewer's own id for convenience. */
  readonly revealSubjectId: string | null;
  /** Whether that subject is an imposter — wire-safe substitute for checking hidden IDs. */
  readonly revealSubjectIsImposter: boolean;
};

function scrubRoundForViewer(snapshot: ImposterSnapshot, viewerId: string): ImposterSnapshot {
  const round = snapshot.round;

  if (!round) {
    return snapshot;
  }

  if (snapshot.step === "results") {
    return snapshot;
  }

  if (round.parallelRoleSeen && round.parallelRevealDone) {
    return scrubParallelRound(snapshot, viewerId);
  }

  return scrubSequentialRound(snapshot, viewerId);
}

function scrubParallelRound(snapshot: ImposterSnapshot, viewerId: string): ImposterSnapshot {
  const round = snapshot.round!;
  const roleSeen = round.parallelRoleSeen?.[viewerId] === true;
  const revealDone = round.parallelRevealDone?.[viewerId] === true;
  const viewerIsImposter = round.imposterPlayerIds.includes(viewerId);
  const maySeeWord =
    !viewerIsImposter &&
    roleSeen &&
    ((snapshot.step === "reveal" && !revealDone) || (revealDone && snapshot.step !== "results"));

  return {
    ...snapshot,
    round: {
      ...round,
      secretWord: maySeeWord ? round.secretWord : "",
      imposterPlayerIds: viewerIsImposter && roleSeen ? [viewerId] : [],
    },
  };
}

function scrubSequentialRound(snapshot: ImposterSnapshot, viewerId: string): ImposterSnapshot {
  const round = snapshot.round!;
  const viewerIsImposter = round.imposterPlayerIds.includes(viewerId);
  const subject = snapshot.players[round.revealPlayerIndex];
  const subjectId = subject?.id ?? null;
  const maySeeWord =
    snapshot.step === "reveal" &&
    round.revealRevealed &&
    viewerId === subjectId &&
    !viewerIsImposter;

  return {
    ...snapshot,
    round: {
      ...round,
      secretWord: maySeeWord ? round.secretWord : "",
      imposterPlayerIds: viewerIsImposter ? [viewerId] : [],
    },
  };
}

export function buildImposterSyncDto(
  snapshot: ImposterSnapshot,
  viewerPlayerId: string,
): ImposterSyncDto {
  const round = snapshot.round;

  const revealSubjectId =
    snapshot.step !== "reveal" || !round
      ? null
      : round.parallelRoleSeen
        ? viewerPlayerId
        : (snapshot.players[round.revealPlayerIndex]?.id ?? null);
  const revealSubjectIsImposter = Boolean(
    revealSubjectId && round?.imposterPlayerIds.includes(revealSubjectId),
  );

  return {
    snapshot: scrubRoundForViewer(snapshot, viewerPlayerId),
    revealSubjectId,
    revealSubjectIsImposter,
  };
}
