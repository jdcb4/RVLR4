import { describe, expect, it } from "vitest";

import {
  evaluateLobbyStartReadiness,
  type LobbyReadinessInput,
} from "@/domain/multiplayer/lobbyReadiness";

function buildInput(overrides: Partial<LobbyReadinessInput> = {}): LobbyReadinessInput {
  return {
    gameKind: "imposter",
    teamCount: 0,
    teamNames: [],
    players: [
      player("host", "Host", true, null, true),
      player("one", "One", false, null, true),
      player("two", "Two", false, null, true),
      player("three", "Three", false, null, true),
    ],
    hatClueDrafts: {},
    ...overrides,
  };
}

function player(
  id: string,
  name: string,
  isHost: boolean,
  teamIndex: number | null,
  ready: boolean,
  disconnectedAt: number | null = null,
) {
  return { id, name, isHost, teamIndex, ready, disconnectedAt };
}

describe("evaluateLobbyStartReadiness", () => {
  it("allows a connected, ready Imposter lobby within the player limits", () => {
    expect(evaluateLobbyStartReadiness(buildInput())).toEqual({ canStart: true, blockers: [] });
  });

  it("reports blockers in actionable priority order", () => {
    const readiness = evaluateLobbyStartReadiness(
      buildInput({
        gameKind: "hat",
        teamCount: 2,
        teamNames: ["Red", "Blue"],
        players: [
          player("host", "Host", true, 0, true),
          player("away", "Away", false, 0, true, 123),
          player("waiting", "Waiting", false, 1, false),
        ],
      }),
    );

    expect(readiness.canStart).toBe(false);
    expect(readiness.blockers.map(({ code }) => code)).toEqual([
      "players-disconnected",
      "team-size",
      "hat-clues",
      "players-not-ready",
    ]);
    expect(readiness.blockers[1]?.message).toContain("Blue: 1");
  });

  it("reports game-specific player bounds", () => {
    const imposter = evaluateLobbyStartReadiness(
      buildInput({ players: buildInput().players.slice(0, 2) }),
    );
    const drawnguess = evaluateLobbyStartReadiness(
      buildInput({ gameKind: "drawnguess", players: buildInput().players.slice(0, 2) }),
    );

    expect(imposter.blockers[0]?.message).toBe("Imposter needs 4–10 players (currently 2).");
    expect(drawnguess.blockers[0]?.message).toBe("DrawNGuess needs 3–8 players (currently 2).");
  });
});
