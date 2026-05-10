import {
  correctWord,
  createMatch,
  endTurn,
  getActiveContext,
  returnSkippedWord,
  showResults,
  skipWord,
  startTurn,
} from "@/domain/whowhatwhere/game";
import type { MatchState } from "@/domain/whowhatwhere/types";

import { validateWhoWhatWhereLobby } from "./lobbyControl.ts";
import { buildTeamSetupsFromLobby } from "./lobbyHelpers.ts";
import { assertTeamLobbyReady, type Room } from "./roomStore.ts";

export async function startWhoWhatWhereMatch(room: Room) {
  assertTeamLobbyReady(room);
  const setups = buildTeamSetupsFromLobby(room);
  validateWhoWhatWhereLobby(room, setups);

  room.wwwMatch = createMatch(setups, room.wwwSettings);
  /** One step before each turn: show “Start turn” (no separate “describer ready” tap). */
  room.wwwReadyReveal = true;
  room.phase = "playing";
}

export function markReadyGate(room: Room) {
  room.wwwReadyReveal = true;
}

export async function applyWhoWhatWhereStartTurn(room: Room) {
  const match = room.wwwMatch;

  if (!match || match.stage !== "ready") {
    throw new Error("The game is not waiting on a new turn.");
  }

  const { wordDeck } = await import("@/data/words.generated");
  room.wwwMatch = startTurn(match, wordDeck);
  room.wwwReadyReveal = false;
}

export function applyWhoWhatWhereCorrect(room: Room, actorId: string) {
  const match = requireActiveTurn(room);
  assertActorIsDescriber(match, actorId);
  room.wwwMatch = correctWord(match);
}

export function applyWhoWhatWhereSkip(room: Room, actorId: string) {
  const match = requireActiveTurn(room);
  assertActorIsDescriber(match, actorId);
  room.wwwMatch = skipWord(match);
}

export function applyWhoWhatWhereReturnSkipped(
  room: Room,
  actorId: string,
  skippedWordId: string,
) {
  const match = requireActiveTurn(room);
  assertActorIsDescriber(match, actorId);
  room.wwwMatch = returnSkippedWord(match, skippedWordId);
}

export function applyWhoWhatWhereEndTurn(room: Room, actorId: string) {
  const match = requireActiveTurn(room);
  assertActorIsDescriber(match, actorId);
  room.wwwMatch = endTurn(match);
  /** Next describer can go straight to Start turn (same as initial ready state). */
  room.wwwReadyReveal = true;
}

export function applyWhoWhatWhereFinalScores(room: Room) {
  const match = room.wwwMatch;

  if (!match) {
    throw new Error("No active match.");
  }

  if (match.stage !== "finalSummary") {
    throw new Error("Final scores are not unlocked yet.");
  }

  room.wwwMatch = showResults(match);
}

function requireActiveTurn(room: Room): MatchState {
  const match = room.wwwMatch;

  if (!match || match.stage !== "turn" || !match.activeTurn) {
    throw new Error("No turn is running right now.");
  }

  return match;
}

function assertActorIsDescriber(match: MatchState, actorId: string) {
  const context = getActiveContext(match);

  if (context.describer.id !== actorId) {
    throw new Error("Only the active describer can do that.");
  }
}
