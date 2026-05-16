import {
  advanceReveal,
  advanceTurn,
  createDefaultDrawNGuessSettings,
  createDrawNGuessMatch,
  getPublicMatchSnapshot,
  isTurnComplete,
  openRevealPacket,
  submitDrawing,
  submitGuess,
  submitPrompt,
  updateDrawingDraft,
  updateGuessDraft,
  updatePromptDraft,
} from "@/domain/drawnguess/engine";
import type {
  DrawNGuessDrawing,
  DrawNGuessPromptMode,
  DrawNGuessSettings,
} from "@/domain/drawnguess/types";
import { getDefaultDrawNGuessWordPack } from "@/domain/drawnguess/wordPacks";

import type { Room } from "./roomStore.ts";

export function patchDrawNGuessSettings(room: Room, patch: Partial<DrawNGuessSettings>) {
  if (room.gameKind !== "drawnguess" || room.phase !== "lobby") {
    throw new Error("DrawNGuess settings are not available.");
  }

  const current = room.drawnguessSettings ?? createDefaultDrawNGuessSettings();

  room.drawnguessSettings = createDefaultDrawNGuessSettings({
    ...current,
    ...(patch.startingPromptMode
      ? { startingPromptMode: normalizePromptMode(patch.startingPromptMode) }
      : {}),
    ...(typeof patch.wordPackId === "string" ? { wordPackId: patch.wordPackId } : {}),
    ...(typeof patch.drawingDurationMs === "number"
      ? { drawingDurationMs: patch.drawingDurationMs }
      : {}),
    ...(typeof patch.guessDurationMs === "number"
      ? { guessDurationMs: patch.guessDurationMs }
      : {}),
    ...(typeof patch.customPromptDurationMs === "number"
      ? { customPromptDurationMs: patch.customPromptDurationMs }
      : {}),
    ...(typeof patch.autoSubmitGraceMs === "number"
      ? { autoSubmitGraceMs: patch.autoSubmitGraceMs }
      : {}),
  });
}

export function startDrawNGuessMatch(room: Room, now = Date.now()) {
  if (room.gameKind !== "drawnguess") {
    throw new Error("This room is not a DrawNGuess room.");
  }

  const wordPack = getDefaultDrawNGuessWordPack();
  const players = [...room.players.values()].map((player) => ({
    id: player.id,
    name: player.name,
  }));

  room.drawnguessMatch = createDrawNGuessMatch({
    players,
    settings: room.drawnguessSettings ?? createDefaultDrawNGuessSettings(),
    wordSource: wordPack.prompts,
    now,
  });
  room.phase = "playing";
}

export function applyDrawNGuessPromptDraft(room: Room, playerId: string, text: string) {
  room.drawnguessMatch = updatePromptDraft(requireDrawNGuessMatch(room), playerId, text);
}

export function applyDrawNGuessPromptSubmit(room: Room, playerId: string, text: string) {
  room.drawnguessMatch = submitPrompt(requireDrawNGuessMatch(room), playerId, text);
}

export function applyDrawNGuessDrawingDraft(
  room: Room,
  playerId: string,
  drawing: DrawNGuessDrawing,
) {
  room.drawnguessMatch = updateDrawingDraft(requireDrawNGuessMatch(room), playerId, drawing);
}

export function applyDrawNGuessDrawingSubmit(
  room: Room,
  playerId: string,
  drawing: DrawNGuessDrawing,
) {
  room.drawnguessMatch = submitDrawing(requireDrawNGuessMatch(room), playerId, drawing);
}

export function applyDrawNGuessGuessDraft(room: Room, playerId: string, text: string) {
  room.drawnguessMatch = updateGuessDraft(requireDrawNGuessMatch(room), playerId, text);
}

export function applyDrawNGuessGuessSubmit(room: Room, playerId: string, text: string) {
  room.drawnguessMatch = submitGuess(requireDrawNGuessMatch(room), playerId, text);
}

export function applyDrawNGuessAdvanceTurn(room: Room, actorIsHost: boolean) {
  if (!actorIsHost) {
    throw new Error("Only the host can advance the turn early.");
  }

  const match = requireDrawNGuessMatch(room);

  if (!isTurnComplete(match)) {
    throw new Error("The turn is still waiting on players.");
  }

  room.drawnguessMatch = advanceTurn(match);
}

export function applyDrawNGuessExpireTurn(room: Room, now = Date.now()) {
  const match = requireDrawNGuessMatch(room);
  const turn = match.activeTurn;

  if (!turn || now < turn.graceDeadlineAt) {
    return false;
  }

  room.drawnguessMatch = advanceTurn(match, now);

  return true;
}

export function applyDrawNGuessAdvanceReveal(
  room: Room,
  actorIsHost: boolean,
  direction: "next" | "previous",
) {
  if (!actorIsHost) {
    throw new Error("Only the host can control the reveal.");
  }

  room.drawnguessMatch = advanceReveal(requireDrawNGuessMatch(room), direction);
}

export function applyDrawNGuessOpenRevealPacket(
  room: Room,
  actorIsHost: boolean,
  starterPlayerId: string,
) {
  if (!actorIsHost) {
    throw new Error("Only the host can choose reveal packets.");
  }

  room.drawnguessMatch = openRevealPacket(requireDrawNGuessMatch(room), starterPlayerId);
}

export function canOfferDrawNGuessReplay(room: Room): boolean {
  return (
    room.gameKind === "drawnguess" &&
    room.phase === "playing" &&
    room.drawnguessMatch !== undefined &&
    getPublicMatchSnapshot(room.drawnguessMatch).phase === "complete"
  );
}

function requireDrawNGuessMatch(room: Room) {
  if (room.gameKind !== "drawnguess" || room.phase !== "playing" || !room.drawnguessMatch) {
    throw new Error("DrawNGuess is not in progress.");
  }

  return room.drawnguessMatch;
}

function normalizePromptMode(mode: DrawNGuessPromptMode): DrawNGuessPromptMode {
  return mode === "custom" ? "custom" : "predetermined";
}
