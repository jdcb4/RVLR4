import { getImposterWordList } from "@/data/imposterWordList";
import { dealImposterRound } from "@/domain/imposter/round";
import type {
  ImposterPlayer,
  ImposterRoundState,
  ImposterSnapshot,
  ImposterStep,
} from "@/features/imposter/imposterAppTypes";

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

function pickCluesStarter(
  players: readonly ImposterPlayer[],
  rng: () => number,
): string {
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
  switch (action.type) {
    case "reveal-show-role": {
      const snap = requireImposterPlaying(room);

      if (snap.step !== "reveal" || !snap.round) {
        throw new Error("Reveal is not active.");
      }

      const round = snap.round;

      if (round.parallelRoleSeen) {
        room.imposterSnapshot = {
          ...snap,
          round: {
            ...round,
            parallelRoleSeen: {
              ...round.parallelRoleSeen,
              [actorId]: true,
            },
          },
        };

        return;
      }

      const subject = snap.players[snap.round.revealPlayerIndex];

      if (!subject || subject.id !== actorId) {
        throw new Error("Only the player whose reveal it is can continue.");
      }

      room.imposterSnapshot = {
        ...snap,
        round: { ...snap.round, revealRevealed: true },
      };

      return;
    }

    case "reveal-confirm-next": {
      const snap = requireImposterPlaying(room);

      if (snap.step !== "reveal" || !snap.round) {
        throw new Error("Reveal is not active.");
      }

      const round = snap.round;

      if (round.parallelRevealDone && round.parallelRoleSeen) {
        if (!round.parallelRoleSeen[actorId]) {
          throw new Error("Reveal your role first.");
        }

        const ids = snap.players.map((player) => player.id);
        const nextDone = { ...round.parallelRevealDone, [actorId]: true };

        if (!allTrue(ids, nextDone)) {
          room.imposterSnapshot = {
            ...snap,
            round: {
              ...round,
              parallelRevealDone: nextDone,
            },
          };

          return;
        }

        const starter = pickCluesStarter(snap.players, Math.random);

        room.imposterSnapshot = {
          ...snap,
          step: "guidePregame",
          cluesStartPlayerId: starter,
          round: {
            ...round,
            parallelRevealDone: nextDone,
          },
        };

        return;
      }

      const subject = snap.players[snap.round.revealPlayerIndex];

      if (!subject || subject.id !== actorId) {
        throw new Error("Only the player whose reveal it is can continue.");
      }

      if (!snap.round.revealRevealed) {
        throw new Error("Reveal the role first.");
      }

      const lastIndex = snap.players.length - 1;

      if (snap.round.revealPlayerIndex >= lastIndex) {
        room.imposterSnapshot = {
          ...snap,
          step: "guidePregame",
          cluesStartPlayerId: pickCluesStarter(snap.players, Math.random),
        };

        return;
      }

      room.imposterSnapshot = {
        ...snap,
        round: {
          ...snap.round,
          revealPlayerIndex: snap.round.revealPlayerIndex + 1,
          revealRevealed: false,
        },
      };

      return;
    }

    case "guide-pregame-done": {
      advanceHostGuide(room, actorIsHost, "guidePregame", "guidePrediscussion");

      return;
    }

    case "guide-prediscussion-done": {
      advanceHostGuide(room, actorIsHost, "guidePrediscussion", "guideWarning");

      return;
    }

    case "guide-warning-done": {
      advanceHostGuide(room, actorIsHost, "guideWarning", "results");

      return;
    }

    default: {
      const never: never = action;
      throw new Error(`Unsupported Imposter action: ${String(never)}`);
    }
  }
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
