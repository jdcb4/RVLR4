import { dealImposterRound } from "@/domain/imposter/round";
import { getImposterWordList } from "@/domain/imposter/wordList";
import type {
  ImposterPlayer,
  ImposterRoundState,
  ImposterSnapshot,
  ImposterStep,
} from "@/features/imposter/imposterSingleplayerAppTypes";

import { assertLobbyReadyForImposterStart } from "./lobbyControl.ts";
import type { Room } from "./roomStore.ts";

export type ImposterDispatchAction =
  | { readonly type: "reveal-show-role" }
  | { readonly type: "reveal-confirm-next" }
  | { readonly type: "guide-pregame-done" }
  | { readonly type: "guide-prediscussion-done" }
  | { readonly type: "guide-warning-done" };

function parallelMaps(playerIds: readonly string[]): {
  readonly parallelRoleSeen: Record<string, boolean>;
  readonly parallelRevealDone: Record<string, boolean>;
} {
  const parallelRoleSeen = Object.fromEntries(playerIds.map((id) => [id, false]));
  const parallelRevealDone = Object.fromEntries(playerIds.map((id) => [id, false]));

  return { parallelRoleSeen, parallelRevealDone };
}

function allTrue(ids: readonly string[], map: Record<string, boolean> | undefined): boolean {
  if (!map) {
    return false;
  }

  return ids.every((id) => map[id] === true);
}

function pickCluesStarter(players: readonly ImposterPlayer[], rng: () => number): string {
  const index = Math.floor(rng() * players.length);

  return players[index]?.id ?? players[0]!.id;
}

export function startImposterMatch(room: Room) {
  assertLobbyReadyForImposterStart(room);

  const sortedPlayers = [...room.players.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );

  const players: ImposterPlayer[] = sortedPlayers.map((player) => ({
    id: player.id,
    name: player.name,
    avatarId: player.avatarId,
  }));

  const wordBank = getImposterWordList();

  const deal = dealImposterRound({
    playerIds: players.map((player) => player.id),
    imposterCount: room.imposterImposterCount,
    wordBank,
    rng: Math.random,
  });

  const ids = players.map((player) => player.id);
  const { parallelRoleSeen, parallelRevealDone } = parallelMaps(ids);

  const round: ImposterRoundState = {
    secretWord: deal.secretWord,
    imposterPlayerIds: [...deal.imposterPlayerIds],
    revealPlayerIndex: 0,
    revealRevealed: false,
    parallelRoleSeen,
    parallelRevealDone,
  };

  room.imposterSnapshot = {
    step: "reveal",
    playerCount: players.length,
    imposterCount: room.imposterImposterCount,
    players,
    round,
    cluesStartPlayerId: null,
  };
  room.phase = "playing";
}

function requireImposterPlaying(room: Room): ImposterSnapshot {
  if (room.gameKind !== "imposter" || room.phase !== "playing") {
    throw new Error("Imposter is not in progress.");
  }

  const snap = room.imposterSnapshot;

  if (!snap) {
    throw new Error("No Imposter round state.");
  }

  return snap;
}

export function applyImposterDispatch(
  room: Room,
  actorId: string,
  actorIsHost: boolean,
  action: ImposterDispatchAction,
) {
  if (action.type === "reveal-show-role") {
    showRevealRole(room, actorId);
  } else if (action.type === "reveal-confirm-next") {
    confirmReveal(room, actorId);
  } else if (action.type === "guide-pregame-done") {
    advanceHostGuide(room, actorIsHost, "guidePregame", "guidePrediscussion");
  } else if (action.type === "guide-prediscussion-done") {
    advanceHostGuide(room, actorIsHost, "guidePrediscussion", "guideWarning");
  } else {
    advanceHostGuide(room, actorIsHost, "guideWarning", "results");
  }
}

function requireReveal(room: Room): { snapshot: ImposterSnapshot; round: ImposterRoundState } {
  const snapshot = requireImposterPlaying(room);

  if (snapshot.step !== "reveal" || !snapshot.round) {
    throw new Error("Reveal is not active.");
  }

  return { snapshot, round: snapshot.round };
}

function requireRevealSubject(snapshot: ImposterSnapshot, actorId: string): void {
  if (snapshot.players[snapshot.round!.revealPlayerIndex]?.id !== actorId) {
    throw new Error("Only the player whose reveal it is can continue.");
  }
}

function showRevealRole(room: Room, actorId: string): void {
  const { snapshot, round } = requireReveal(room);

  if (round.parallelRoleSeen) {
    room.imposterSnapshot = {
      ...snapshot,
      round: {
        ...round,
        parallelRoleSeen: { ...round.parallelRoleSeen, [actorId]: true },
      },
    };
    return;
  }

  requireRevealSubject(snapshot, actorId);
  room.imposterSnapshot = { ...snapshot, round: { ...round, revealRevealed: true } };
}

function confirmReveal(room: Room, actorId: string): void {
  const reveal = requireReveal(room);

  if (reveal.round.parallelRevealDone && reveal.round.parallelRoleSeen) {
    confirmParallelReveal(room, actorId, reveal.snapshot, reveal.round);
  } else {
    confirmSequentialReveal(room, actorId, reveal.snapshot, reveal.round);
  }
}

function confirmParallelReveal(
  room: Room,
  actorId: string,
  snapshot: ImposterSnapshot,
  round: ImposterRoundState,
): void {
  if (!round.parallelRoleSeen?.[actorId]) {
    throw new Error("Reveal your role first.");
  }

  const nextDone = { ...round.parallelRevealDone, [actorId]: true };
  const complete = allTrue(
    snapshot.players.map((player) => player.id),
    nextDone,
  );
  room.imposterSnapshot = {
    ...snapshot,
    ...(complete
      ? {
          step: "guidePregame" as const,
          cluesStartPlayerId: pickCluesStarter(snapshot.players, Math.random),
        }
      : {}),
    round: { ...round, parallelRevealDone: nextDone },
  };
}

function confirmSequentialReveal(
  room: Room,
  actorId: string,
  snapshot: ImposterSnapshot,
  round: ImposterRoundState,
): void {
  requireRevealSubject(snapshot, actorId);

  if (!round.revealRevealed) {
    throw new Error("Reveal the role first.");
  }

  if (round.revealPlayerIndex >= snapshot.players.length - 1) {
    room.imposterSnapshot = {
      ...snapshot,
      step: "guidePregame",
      cluesStartPlayerId: pickCluesStarter(snapshot.players, Math.random),
    };
    return;
  }

  room.imposterSnapshot = {
    ...snapshot,
    round: { ...round, revealPlayerIndex: round.revealPlayerIndex + 1, revealRevealed: false },
  };
}

function advanceHostGuide(
  room: Room,
  actorIsHost: boolean,
  expectedStep: ImposterStep,
  nextStep: ImposterStep,
) {
  if (!actorIsHost) {
    throw new Error("Only the host can advance this screen.");
  }

  const snap = requireImposterPlaying(room);

  if (snap.step !== expectedStep) {
    throw new Error("That transition is not valid right now.");
  }

  room.imposterSnapshot = {
    ...snap,
    step: nextStep,
  };
}
