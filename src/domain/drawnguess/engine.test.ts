import { describe, expect, it } from "vitest";

import {
  advanceReveal,
  advanceTurn,
  createDefaultDrawNGuessSettings,
  createDrawNGuessMatch,
  getAssignmentForPlayer,
  getPacketIndexForPlayer,
  getPrivatePlayerSnapshot,
  getPublicMatchSnapshot,
  getTurnMode,
  isTurnComplete,
  openRevealPacket,
  submitDrawing,
  submitGuess,
  submitPrompt,
  updateDrawingDraft,
  updateGuessDraft,
} from "./engine";
import type { DrawNGuessDrawing, DrawNGuessPlayer, DrawNGuessWordPrompt } from "./types";

const players: readonly DrawNGuessPlayer[] = [
  { id: "p1", name: "Ari" },
  { id: "p2", name: "Bea" },
  { id: "p3", name: "Cam" },
  { id: "p4", name: "Dee" },
  { id: "p5", name: "Eli" },
];

const prompts: readonly DrawNGuessWordPrompt[] = [
  "Rocket",
  "Pizza",
  "Castle",
  "Guitar",
  "Octopus",
  "Cloud",
].map((phrase) => ({
  phrase,
  category: "Standard",
  difficulty: "Easy",
}));

const drawing: DrawNGuessDrawing = {
  format: "strokes-v1",
  width: 512,
  height: 512,
  strokes: [
    {
      id: "s1",
      color: "#111827",
      size: 7,
      tool: "pen",
      points: [
        { x: 0.1, y: 0.2 },
        { x: 0.2, y: 0.3 },
      ],
    },
  ],
};

describe("DrawNGuess engine", () => {
  it("alternates turn modes and rotates packets across every player", () => {
    expect(getTurnMode(0)).toBe("drawing");
    expect(getTurnMode(1)).toBe("guessing");

    const seenByPlayer = players.map((_player, playerIndex) =>
      players.map((_turn, turnIndex) =>
        getPacketIndexForPlayer(playerIndex, turnIndex, players.length),
      ),
    );

    for (const packetIndexes of seenByPlayer) {
      expect(new Set(packetIndexes).size).toBe(players.length);
    }
  });

  it("creates predetermined packets without leaking assignments into the public snapshot", () => {
    const match = createDrawNGuessMatch({
      players,
      wordSource: prompts,
      rng: () => 0,
      now: 1_000,
    });

    expect(match.phase).toBe("turn");
    expect(match.packets).toHaveLength(players.length);
    expect(match.packets[0]?.entries[0]).toMatchObject({
      type: "prompt",
      playerId: "deck",
    });

    const publicSnapshot = getPublicMatchSnapshot(match);
    expect(publicSnapshot.revealPacket).toBeUndefined();
    expect(publicSnapshot.packets).toBeUndefined();

    const privateSnapshot = getPrivatePlayerSnapshot(match, "p1");
    expect(privateSnapshot.assignment).toMatchObject({
      mode: "drawing",
      promptText: expect.any(String),
    });
  });

  it("records custom prompts as original packet entries before drawing begins", () => {
    let match = createDrawNGuessMatch({
      players: players.slice(0, 3),
      settings: createDefaultDrawNGuessSettings({ startingPromptMode: "custom" }),
      wordSource: prompts,
      now: 10_000,
    });

    expect(match.phase).toBe("custom-prompt");
    match = submitPrompt(match, "p1", "Moon base", 10_100);
    match = submitPrompt(match, "p2", "Surfboard", 10_200);
    match = submitPrompt(match, "p3", "Treehouse", 10_300);
    expect(isTurnComplete(match)).toBe(true);

    match = advanceTurn(match, 10_400);

    expect(match.phase).toBe("turn");
    expect(match.activeTurn?.mode).toBe("drawing");
    expect(match.packets[0]?.entries[0]).toMatchObject({
      type: "prompt",
      playerId: "p1",
      text: "Moon base",
    });
  });

  it("preserves draft drawings on timer auto-submit and fills missing guesses with placeholders", () => {
    let match = createDrawNGuessMatch({
      players: players.slice(0, 3),
      wordSource: prompts,
      now: 1_000,
    });

    match = updateDrawingDraft(match, "p1", drawing, 1_100);
    match = submitDrawing(match, "p2", drawing, 1_200);
    match = submitDrawing(match, "p3", drawing, 1_300);
    match = advanceTurn(match, 62_600);

    expect(match.activeTurn?.mode).toBe("guessing");
    expect(match.packets[0]?.entries[1]).toMatchObject({
      type: "drawing",
      playerId: "p1",
    });
    expect(match.packets[0]?.entries[1]?.placeholder).toBeUndefined();

    match = updateGuessDraft(match, "p1", "rocket?", 62_800);
    match = submitGuess(match, "p2", "pizza", 62_900);
    match = advanceTurn(match, 94_200);

    const packetForP1Guess = match.packets[2];
    const packetForMissingGuess = match.packets[1];

    expect(packetForP1Guess?.entries[2]).toMatchObject({
      type: "guess",
      text: "rocket?",
    });
    expect(packetForP1Guess?.entries[2]?.placeholder).toBeUndefined();
    expect(packetForMissingGuess?.entries[2]).toMatchObject({
      type: "guess",
      text: "[no response submitted]",
      placeholder: true,
    });
  });

  it("allows submitted guesses to be replaced before the turn locks", () => {
    let match = createDrawNGuessMatch({
      players: players.slice(0, 3),
      wordSource: prompts,
      now: 1_000,
    });

    for (const player of players.slice(0, 3)) {
      match = submitDrawing(match, player.id, drawing, 1_100);
    }

    match = advanceTurn(match, 1_200);
    match = submitGuess(match, "p1", "first", 1_300);
    match = submitGuess(match, "p1", "second", 1_400);

    expect(getPrivatePlayerSnapshot(match, "p1").ownSubmission).toMatchObject({
      status: "submitted",
      guessText: "second",
    });
  });

  it("steps through reveal packets and can reopen a chosen starter packet", () => {
    let match = createDrawNGuessMatch({
      players: players.slice(0, 3),
      wordSource: prompts,
      now: 1_000,
    });

    for (let turnIndex = 0; turnIndex < 3; turnIndex += 1) {
      const mode = match.activeTurn?.mode;

      for (const player of players.slice(0, 3)) {
        match =
          mode === "drawing"
            ? submitDrawing(match, player.id, drawing, 1_100 + turnIndex)
            : submitGuess(match, player.id, `guess ${turnIndex}`, 1_100 + turnIndex);
      }

      match = advanceTurn(match, 1_200 + turnIndex);
    }

    expect(match.phase).toBe("reveal");
    match = advanceReveal(match);
    expect(match.revealEntryIndex).toBe(1);
    match = openRevealPacket(match, "p3");
    expect(match.revealPacketIndex).toBe(2);
    expect(getAssignmentForPlayer(match, "p1")).toBeNull();
  });
});
