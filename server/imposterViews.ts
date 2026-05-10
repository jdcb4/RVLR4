import type { ImposterSnapshot } from "@/features/imposter/imposterAppTypes";

export type ImposterSyncDto = {
  readonly snapshot: ImposterSnapshot;
  /** Sequential reveal: active subject. Parallel reveal: viewer's own id for convenience. */
  readonly revealSubjectId: string | null;
  /** Whether that subject is an imposter — wire-safe substitute for checking hidden IDs. */
  readonly revealSubjectIsImposter: boolean;
};

function scrubRoundForViewer(
  snapshot: ImposterSnapshot,
  viewerId: string,
): ImposterSnapshot {
  const round = snapshot.round;

  if (!round) {
    return snapshot;
  }

  const viewerIsImposter = round.imposterPlayerIds.includes(viewerId);

  if (snapshot.step === "results") {
    return snapshot;
  }

  /** Multiplayer parallel reveal — per-viewer scrub */
  if (round.parallelRoleSeen && round.parallelRevealDone) {
    const roleSeen = round.parallelRoleSeen[viewerId] === true;
    const revealDone = round.parallelRevealDone[viewerId] === true;

    let secretWordOut = "";

    if (
      snapshot.step === "reveal" &&
      roleSeen &&
      !revealDone &&
      !viewerIsImposter
    ) {
      secretWordOut = round.secretWord;
    }

    return {
      ...snapshot,
      round: {
        ...round,
        secretWord: secretWordOut,
        imposterPlayerIds: roleSeen && !revealDone && viewerIsImposter ? [viewerId] : [],
      },
    };
  }

  const subject = snapshot.players[round.revealPlayerIndex];
  const subjectId = subject?.id ?? null;

  let secretWordOut = "";

  if (
    snapshot.step === "reveal" &&
    round.revealRevealed &&
    viewerId === subjectId &&
    !viewerIsImposter
  ) {
    secretWordOut = round.secretWord;
  }

  return {
    ...snapshot,
    round: {
      ...round,
      secretWord: secretWordOut,
      imposterPlayerIds: viewerIsImposter ? [viewerId] : [],
    },
  };
}

export function buildImposterSyncDto(
  snapshot: ImposterSnapshot,
  viewerPlayerId: string,
): ImposterSyncDto {
  const round = snapshot.round;

  let revealSubjectId: string | null = null;
  let revealSubjectIsImposter = false;

  if (snapshot.step === "reveal" && round) {
    if (round.parallelRoleSeen) {
      revealSubjectId = viewerPlayerId;
      revealSubjectIsImposter = round.imposterPlayerIds.includes(viewerPlayerId);
    } else {
      const subject = snapshot.players[round.revealPlayerIndex];
      revealSubjectId = subject?.id ?? null;

      if (subject) {
        revealSubjectIsImposter = round.imposterPlayerIds.includes(subject.id);
      }
    }
  }

  return {
    snapshot: scrubRoundForViewer(snapshot, viewerPlayerId),
    revealSubjectId,
    revealSubjectIsImposter,
  };
}
