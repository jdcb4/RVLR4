import type { WhoWhatWherePeerRole } from "@/domain/multiplayer/protocol";
import { getActiveContext, getCurrentWord } from "@/domain/whowhatwhere/game";
import type { ActiveTurn, MatchState, WordEntry } from "@/domain/whowhatwhere/types";

export function classifyWhoWhatWhereRole(
  match: MatchState,
  viewerPlayerId: string,
): WhoWhatWherePeerRole {
  const context = getActiveContext(match);
  const viewer = match.players.find((player) => player.id === viewerPlayerId);

  if (context.describer.id === viewerPlayerId) {
    return "describer";
  }

  if (viewer && viewer.teamId === context.team.id) {
    return "guesser";
  }

  return "observer";
}

function scrubWordEntry(word: WordEntry): WordEntry {
  return {
    ...word,
    word: "•••",
    hint: "",
  };
}

function scrubActiveTurn(turn: ActiveTurn): ActiveTurn {
  return {
    ...turn,
    wordQueue: turn.wordQueue.map((entry) => scrubWordEntry(entry)),
    wordHistory: turn.wordHistory.map((entry) => ({ ...entry, word: scrubWordEntry(entry.word) })),
    skippedWords: turn.skippedWords.map((skipped) => ({
      ...skipped,
      word: scrubWordEntry(skipped.word),
    })),
    currentSkippedWord: turn.currentSkippedWord
      ? {
          ...turn.currentSkippedWord,
          word: scrubWordEntry(turn.currentSkippedWord.word),
        }
      : null,
  };
}

function scrubWordReserves(match: MatchState): MatchState["wordReserves"] {
  return Object.fromEntries(
    Object.entries(match.wordReserves).map(([category, words]) => [
      category,
      words?.map((word) => scrubWordEntry(word)),
    ]),
  );
}

/**
 * Strips secret words for anyone who is not the active describer during a live turn.
 * Category + timers remain so teammates can follow along without peeking.
 */
export function projectWhoWhatWhereMatch(match: MatchState, viewerPlayerId: string): MatchState {
  const projectedBase = { ...match, wordReserves: scrubWordReserves(match) };

  if (match.stage !== "turn" || !match.activeTurn) {
    return projectedBase;
  }

  if (classifyWhoWhatWhereRole(match, viewerPlayerId) === "describer") {
    return projectedBase;
  }

  return {
    ...projectedBase,
    activeTurn: scrubActiveTurn(match.activeTurn),
  };
}

export function shouldShowWhoWhatWhereTurnFooter(
  match: MatchState,
  viewerPlayerId: string,
): boolean {
  return (
    match.stage === "turn" &&
    Boolean(match.activeTurn) &&
    classifyWhoWhatWhereRole(match, viewerPlayerId) === "describer"
  );
}

export function canReturnSkippedWords(match: MatchState, viewerPlayerId: string): boolean {
  return (
    match.stage === "turn" &&
    Boolean(match.activeTurn) &&
    classifyWhoWhatWhereRole(match, viewerPlayerId) === "describer" &&
    Boolean(getCurrentWord(match.activeTurn))
  );
}
