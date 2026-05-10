import {
  getHatGameContext,
} from "@/domain/hat-game/engine";
import type {
  ActiveTurn,
  HatGameSession,
  QueuedClue,
} from "@/domain/hat-game/types";

export type HatPeerRole = "describer" | "guesser" | "observer";

const MASK = "••••••";

function scrubQueuedClue(clue: QueuedClue): QueuedClue {
  return { ...clue, text: MASK };
}

function scrubActiveTurnForGuessers(turn: ActiveTurn): ActiveTurn {
  return {
    ...turn,
    clueQueue: turn.clueQueue.map((clue) => scrubQueuedClue(clue)),
    skippedClues: turn.skippedClues.map((entry) => ({
      ...entry,
      text: MASK,
    })),
  };
}

export function classifyHatRole(
  session: HatGameSession,
  viewerPlayerId: string,
): HatPeerRole {
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
  if (session.stage !== "turn" || !session.activeTurn) {
    return session;
  }

  if (classifyHatRole(session, viewerPlayerId) === "describer") {
    return session;
  }

  return {
    ...session,
    activeTurn: scrubActiveTurnForGuessers(session.activeTurn),
  };
}

export function shouldShowHatTurnFooter(
  session: HatGameSession,
  viewerPlayerId: string,
): boolean {
  return (
    session.stage === "turn" &&
    Boolean(session.activeTurn) &&
    classifyHatRole(session, viewerPlayerId) === "describer"
  );
}

export function canHatReturnSkipped(
  session: HatGameSession,
  viewerPlayerId: string,
): boolean {
  return (
    session.stage === "turn" &&
    Boolean(session.activeTurn) &&
    classifyHatRole(session, viewerPlayerId) === "describer" &&
    (session.activeTurn.skippedClues.length > 0 ||
      session.activeTurn.currentSkippedCluePoolIndex !== null)
  );
}
