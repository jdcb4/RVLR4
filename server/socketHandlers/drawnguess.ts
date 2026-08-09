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
} from "../drawnguessRuntime.ts";
import { type HandlerContext,registerHandler } from "../socketHandle.ts";
import type { SocketEventName, SocketPayload } from "../socketSchemas.ts";
import type { SocketHandlerContext } from "./types.ts";

export function registerDrawNGuessHandlers({ io, socket, store }: SocketHandlerContext) {
  const register = <E extends SocketEventName>(
    event: E,
    message: string,
    handler: (context: HandlerContext, payload: SocketPayload<E>) => Promise<void> | void,
  ) => registerHandler(socket, store, event, message, handler);

  register(
    "drawnguess:updatePromptDraft",
    "Unable to update prompt.",
    async ({ room, actor }, payload) => {
      applyDrawNGuessPromptDraft(room, actor.id, payload.text);
      await broadcastRoom(io, store, room.code);
    },
  );
  register(
    "drawnguess:submitPrompt",
    "Unable to submit prompt.",
    async ({ room, actor }, payload) => {
      applyDrawNGuessPromptSubmit(room, actor.id, payload.text);
      applyDrawNGuessAdvanceTurnIfComplete(room);
      await broadcastRoom(io, store, room.code);
    },
  );
  register(
    "drawnguess:updateDrawingDraft",
    "Unable to update drawing.",
    async ({ room, actor }, payload) => {
      applyDrawNGuessDrawingDraft(room, actor.id, payload.drawing);
      await broadcastRoom(io, store, room.code);
    },
  );
  register(
    "drawnguess:submitDrawing",
    "Unable to submit drawing.",
    async ({ room, actor }, payload) => {
      applyDrawNGuessDrawingSubmit(room, actor.id, payload.drawing);
      applyDrawNGuessAdvanceTurnIfComplete(room);
      await broadcastRoom(io, store, room.code);
    },
  );
  register(
    "drawnguess:updateGuessDraft",
    "Unable to update guess.",
    async ({ room, actor }, payload) => {
      applyDrawNGuessGuessDraft(room, actor.id, payload.text);
      await broadcastRoom(io, store, room.code);
    },
  );
  register(
    "drawnguess:submitGuess",
    "Unable to submit guess.",
    async ({ room, actor }, payload) => {
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
