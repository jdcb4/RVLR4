import { describe, expect, it } from "vitest";

import type { DrawNGuessDrawing } from "@/domain/drawnguess/types";

import {
  applyDrawNGuessDrawingDraft,
  applyDrawNGuessDrawingSubmit,
  applyDrawNGuessExpireTurn,
  applyDrawNGuessGuessSubmit,
  applyDrawNGuessPromptSubmit,
  patchDrawNGuessSettings,
  startDrawNGuessMatch,
} from "./drawnguessRuntime.ts";
import { buildDrawNGuessSyncDto } from "./drawnguessViews.ts";
import { RoomStore } from "./roomStore.ts";

const drawing: DrawNGuessDrawing = {
  format: "strokes-v1",
  width: 512,
  height: 512,
  strokes: [
    {
      id: "stroke-1",
      color: "#111827",
      size: 6,
      tool: "pen",
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.9, y: 0.9 },
      ],
    },
  ],
};

function buildRoom() {
  const store = new RoomStore();
  const { room, hostPlayer } = store.createRoom({
    gameKind: "drawnguess",
    hostName: "Host",
  });
  const first = store.joinRoom({ code: room.code, name: "Bea" }).player;
  const second = store.joinRoom({ code: room.code, name: "Cam" }).player;

  return { room, hostPlayer, first, second };
}

describe("DrawNGuess runtime", () => {
  it("starts a predetermined match and sends private assignments per viewer", () => {
    const { room, hostPlayer, first } = buildRoom();

    startDrawNGuessMatch(room, 1_000);

    expect(room.phase).toBe("playing");
    expect(room.drawnguessMatch?.phase).toBe("turn");

    const hostSync = buildDrawNGuessSyncDto(room, hostPlayer.id);
    const firstSync = buildDrawNGuessSyncDto(room, first.id);

    expect(hostSync?.public.revealPacket).toBeUndefined();
    expect(hostSync?.private.assignment).toMatchObject({ mode: "drawing" });
    expect(firstSync?.private.assignment).toMatchObject({ mode: "drawing" });
    expect(firstSync?.private.assignment).not.toEqual(hostSync?.private.assignment);
  });

  it("supports custom starting prompts before drawing turns begin", () => {
    const { room, hostPlayer, first, second } = buildRoom();
    const now = Date.now();

    patchDrawNGuessSettings(room, { startingPromptMode: "custom" });
    startDrawNGuessMatch(room, now);

    applyDrawNGuessPromptSubmit(room, hostPlayer.id, "Moon base");
    applyDrawNGuessPromptSubmit(room, first.id, "Surfboard");
    applyDrawNGuessPromptSubmit(room, second.id, "Treehouse");
    expect(
      applyDrawNGuessExpireTurn(
        room,
        (room.drawnguessMatch?.activeTurn?.graceDeadlineAt ?? now) + 1,
      ),
    ).toBe(true);

    expect(room.drawnguessMatch?.phase).toBe("turn");
    expect(room.drawnguessMatch?.packets[0]?.entries[0]).toMatchObject({
      type: "prompt",
      playerId: hostPlayer.id,
      text: "Moon base",
    });
  });

  it("auto-submits partial drawing drafts and advances after the grace window", () => {
    const { room, hostPlayer, first, second } = buildRoom();
    const now = Date.now();

    startDrawNGuessMatch(room, now);
    applyDrawNGuessDrawingDraft(room, hostPlayer.id, drawing);
    applyDrawNGuessDrawingSubmit(room, first.id, drawing);
    applyDrawNGuessDrawingSubmit(room, second.id, drawing);

    expect(
      applyDrawNGuessExpireTurn(room, (room.drawnguessMatch?.activeTurn?.deadlineAt ?? now) + 1),
    ).toBe(false);
    expect(
      applyDrawNGuessExpireTurn(
        room,
        (room.drawnguessMatch?.activeTurn?.graceDeadlineAt ?? now) + 1,
      ),
    ).toBe(true);
    expect(room.drawnguessMatch?.activeTurn?.mode).toBe("guessing");
    expect(room.drawnguessMatch?.packets[0]?.entries[1]).toMatchObject({
      type: "drawing",
      playerId: hostPlayer.id,
    });
  });

  it("keeps turns open for edits until the server deadline closes", () => {
    const { room, hostPlayer, first, second } = buildRoom();
    const now = Date.now();

    startDrawNGuessMatch(room, now);
    applyDrawNGuessDrawingSubmit(room, hostPlayer.id, drawing);
    applyDrawNGuessDrawingSubmit(room, first.id, drawing);
    applyDrawNGuessDrawingSubmit(room, second.id, drawing);
    expect(
      applyDrawNGuessExpireTurn(
        room,
        (room.drawnguessMatch?.activeTurn?.graceDeadlineAt ?? now) + 1,
      ),
    ).toBe(true);

    applyDrawNGuessGuessSubmit(room, hostPlayer.id, "first");
    applyDrawNGuessGuessSubmit(room, hostPlayer.id, "second");

    expect(buildDrawNGuessSyncDto(room, hostPlayer.id)?.private.ownSubmission).toMatchObject({
      status: "submitted",
      guessText: "second",
    });
  });
});
