import { getHatGameContext } from "@/domain/hat-game/engine";
import type { ActiveTurn, HatGameSession, QueuedClue } from "@/domain/hat-game/types";
import type { HatPeerRole } from "@/domain/multiplayer/protocol";

const MASK = "••••••";

function scrubQueuedClue(clue: QueuedClue): QueuedClue {
  return { ...clue, text: MASK };
}

function scrubActiveTurnForGuessers(turn: ActiveTurn): ActiveTurn {
  return {
    ...turn,
    clueQueue: turn.clueQueue.map((clue) => scrubQueuedClue(clue)),
    clueHistory: turn.clueHistory.map((entry) => ({ ...entry, clue: MASK })),
    skippedClues: turn.skippedClues.map((entry) => ({
      ...entry,
      text: MASK,
    })),
  };
}

function scrubCluePool(session: HatGameSession): HatGameSession["cluePool"] {
  return session.cluePool.map((clue) => ({ ...clue, text: MASK }));
}

export function classifyHatRole(session: HatGameSession, viewerPlayerId: string): HatPeerRole {
  const context = getHatGameContext(session);
  const viewer = session.players.find((player) => player.id === viewerPlayerId);

  if (context.activeDescriberId === viewerPlayerId) {
    return "describer";
  }

  if (viewer && viewer.teamId === context.activeTeamId) {
    return "guesser";
  }

  return "observer";
}

/**
 * Hides famous-name text during the timed turn for anyone who is not the active describer.
 */
export function projectHatSessionForViewer(
  session: HatGameSession,
  viewerPlayerId: string,
): HatGameSession {
  const projectedBase = {
    ...session,
    cluePool: session.stage === "results" ? session.cluePool : scrubCluePool(session),
  };

  if (session.stage !== "turn" || !session.activeTurn) {
    return projectedBase;
  }

  if (classifyHatRole(session, viewerPlayerId) === "describer") {
    return projectedBase;
  }

  return {
    ...projectedBase,
    activeTurn: scrubActiveTurnForGuessers(session.activeTurn),
  };
}

export function shouldShowHatTurnFooter(session: HatGameSession, viewerPlayerId: string): boolean {
  return (
    session.stage === "turn" &&
    session.activeTurn !== null &&
    classifyHatRole(session, viewerPlayerId) === "describer"
  );
}

export function canHatReturnSkipped(session: HatGameSession, viewerPlayerId: string): boolean {
  return (
    session.stage === "turn" &&
    session.activeTurn !== null &&
    classifyHatRole(session, viewerPlayerId) === "describer" &&
    (session.activeTurn.skippedClues.length > 0 ||
      session.activeTurn.currentSkippedCluePoolIndex !== null)
  );
}
