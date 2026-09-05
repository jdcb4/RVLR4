import { broadcastRoom } from "../broadcast.ts";
import {
  applyDrawNGuessAdvanceReveal,
  applyDrawNGuessAdvanceTurn,
  applyDrawNGuessAdvanceTurnIfComplete,
  applyDrawNGuessDrawingDraft,
  applyDrawNGuessDrawingSubmit,
  applyDrawNGuessGuessDraft,
  applyDrawNGuessGuessSubmit,
  applyDrawNGuessOpenRevealPacket,
  applyDrawNGuessPromptDraft,
  applyDrawNGuessPromptSubmit,
  assertDrawNGuessTurn,
} from "../drawnguessRuntime.ts";
import { createSocketHandlerRegistrar } from "./register.ts";
import type { SocketHandlerContext } from "./types.ts";

/**
 * Registration-only composition stays together so the prompt/drawing/guess
 * event pairs can be audited as one protocol; each callback delegates its
 * state transition and retains the shared schema/actor/budget guard.
 */
export function registerDrawNGuessHandlers({ io, socket, store }: SocketHandlerContext) {
  const register = createSocketHandlerRegistrar({ io, socket, store });

  register(
    "drawnguess:updatePromptDraft",
    "Unable to update prompt.",
    async ({ room, actor }, payload) => {
      assertDrawNGuessTurn(room, payload.turnKey);
      applyDrawNGuessPromptDraft(room, actor.id, payload.text);
      await broadcastRoom(io, store, room.code);
    },
  );
  register(
    "drawnguess:submitPrompt",
    "Unable to submit prompt.",
    async ({ room, actor }, payload) => {
      assertDrawNGuessTurn(room, payload.turnKey);
      applyDrawNGuessPromptSubmit(room, actor.id, payload.text);
      applyDrawNGuessAdvanceTurnIfComplete(room);
      await broadcastRoom(io, store, room.code);
    },
  );
  register(
    "drawnguess:updateDrawingDraft",
    "Unable to update drawing.",
    async ({ room, actor }, payload) => {
      assertDrawNGuessTurn(room, payload.turnKey);
      applyDrawNGuessDrawingDraft(room, actor.id, payload.drawing);
      await broadcastRoom(io, store, room.code);
    },
  );
  register(
    "drawnguess:submitDrawing",
    "Unable to submit drawing.",
    async ({ room, actor }, payload) => {
      assertDrawNGuessTurn(room, payload.turnKey);
      applyDrawNGuessDrawingSubmit(room, actor.id, payload.drawing);
      applyDrawNGuessAdvanceTurnIfComplete(room);
      await broadcastRoom(io, store, room.code);
    },
  );
  register(
    "drawnguess:updateGuessDraft",
    "Unable to update guess.",
    async ({ room, actor }, payload) => {
      assertDrawNGuessTurn(room, payload.turnKey);
      applyDrawNGuessGuessDraft(room, actor.id, payload.text);
      await broadcastRoom(io, store, room.code);
    },
  );
  register(
    "drawnguess:submitGuess",
    "Unable to submit guess.",
    async ({ room, actor }, payload) => {
      assertDrawNGuessTurn(room, payload.turnKey);
      applyDrawNGuessGuessSubmit(room, actor.id, payload.text);
      applyDrawNGuessAdvanceTurnIfComplete(room);
      await broadcastRoom(io, store, room.code);
    },
  );
  register(
    "drawnguess:advanceTurn",
    "Unable to advance DrawNGuess turn.",
    async ({ room, actor }) => {
      applyDrawNGuessAdvanceTurn(room, actor.isHost);
      await broadcastRoom(io, store, room.code);
    },
  );
  register(
    "drawnguess:advanceReveal",
    "Unable to advance DrawNGuess reveal.",
    async ({ room, actor }, payload) => {
      applyDrawNGuessAdvanceReveal(room, actor.isHost, payload.direction);
      await broadcastRoom(io, store, room.code);
    },
  );
  register(
    "drawnguess:openRevealPacket",
    "Unable to open DrawNGuess packet.",
    async ({ room, actor }, payload) => {
      applyDrawNGuessOpenRevealPacket(room, actor.isHost, payload.starterPlayerId);
      await broadcastRoom(io, store, room.code);
    },
  );
}
