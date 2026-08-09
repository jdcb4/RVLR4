import { GAME_DEFAULTS, type HatGameConfig } from "@/config/hatDefaults";
import { createHatGameSession } from "@/domain/hat-game/engine";
import type { ClueSubmissionMap } from "@/domain/hat-game/types";
import type { AppSnapshot, AppStep } from "@/features/hat-game/hatSingleplayerAppTypes";

export const createInitialHatSnapshot = (step: AppStep = "settings"): AppSnapshot => ({
  step,
  teamEditIndex: 0,
  playerCount: 0,
  teamCount: 2,
  teams: [],
  players: [],
  clueSubmissions: {},
  clueEntryIndex: 0,
  clueEntryRevealed: false,
  handoffRevealed: false,
  session: null,
  turnDurationSeconds: GAME_DEFAULTS.turnDurationSeconds,
  skipsPerTurn: GAME_DEFAULTS.skipsPerTurn,
});

export const normalizeHatSnapshot = (snapshot: AppSnapshot): AppSnapshot => ({
  ...snapshot,
  step: (snapshot.step as string) === "counts" ? "settings" : snapshot.step,
  turnDurationSeconds: snapshot.turnDurationSeconds ?? GAME_DEFAULTS.turnDurationSeconds,
  skipsPerTurn: snapshot.skipsPerTurn ?? GAME_DEFAULTS.skipsPerTurn,
});

const sessionConfigFromSnapshot = (snapshot: AppSnapshot): HatGameConfig => ({
  ...GAME_DEFAULTS,
  turnDurationSeconds: snapshot.turnDurationSeconds,
  skipsPerTurn: snapshot.skipsPerTurn,
});

export const startHatSession = (current: AppSnapshot, sessionSource: AppSnapshot): AppSnapshot => ({
  ...current,
  step: "game",
  session: createHatGameSession({
    players: sessionSource.players,
    teams: sessionSource.teams,
    config: sessionConfigFromSnapshot(sessionSource),
    clueSubmissions: sessionSource.clueSubmissions,
  }),
  handoffRevealed: false,
});

export const syncHatClueSubmissions = (
  players: AppSnapshot["players"],
  current: ClueSubmissionMap,
): ClueSubmissionMap =>
  Object.fromEntries(
    players.map((player) => [
      player.id,
      {
        clues: Array.from(
          { length: GAME_DEFAULTS.cluesPerPlayer },
          (_, index) => current[player.id]?.clues[index] ?? "",
        ),
      },
    ]),
  );
