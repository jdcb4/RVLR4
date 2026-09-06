import { GAME_DEFAULTS, type HatGameConfig } from "@/config/hatDefaults";
import { MIN_PLAYERS_PER_TEAM } from "@/config/teamRoster";
import { createHatGameSession } from "@/domain/hat-game/engine";
import {
  applyRosterRowsToHat,
  buildDefaultSetup,
  getHatGameSetupError,
  type HatRosterTeamRow,
} from "@/domain/hat-game/setup";
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

export type HatTransitionResult =
  | { readonly snapshot: AppSnapshot; readonly error: null }
  | { readonly snapshot: null; readonly error: string };

export function createHatTeamSetup(snapshot: AppSnapshot): HatTransitionResult {
  const playerCount = snapshot.teamCount * MIN_PLAYERS_PER_TEAM;
  const error = getHatGameSetupError({ playerCount, teamCount: snapshot.teamCount });
  if (error) return { snapshot: null, error };
  const { teams, players } = buildDefaultSetup(playerCount, snapshot.teamCount);
  return {
    error: null,
    snapshot: {
      ...snapshot,
      step: "team",
      teamEditIndex: 0,
      playerCount: players.length,
      teams,
      players,
      clueSubmissions: syncHatClueSubmissions(players, {}),
      session: null,
    },
  };
}

export function applyHatRosterTransition(
  snapshot: AppSnapshot,
  rows: readonly HatRosterTeamRow[],
): AppSnapshot {
  const { teams, players } = applyRosterRowsToHat(rows, snapshot.teams);
  return {
    ...snapshot,
    teams,
    players,
    playerCount: players.length,
    clueSubmissions: syncHatClueSubmissions(players, snapshot.clueSubmissions),
  };
}

export function advanceHatTeamStep(snapshot: AppSnapshot): HatTransitionResult {
  const team = snapshot.teams[snapshot.teamEditIndex];
  const players = team ? snapshot.players.filter((player) => player.teamId === team.id) : [];
  if (!team?.name.trim() || players.some((player) => !player.name.trim())) {
    return { snapshot: null, error: "Name the team and every player before continuing." };
  }
  return {
    error: null,
    snapshot: {
      ...snapshot,
      teamEditIndex: snapshot.teamEditIndex + 1,
      step: snapshot.teamEditIndex >= snapshot.teams.length - 1 ? "review" : "team",
    },
  };
}

export const backHatTeamStep = (snapshot: AppSnapshot): AppSnapshot => ({
  ...snapshot,
  step: snapshot.teamEditIndex === 0 ? "settings" : "team",
  teamEditIndex: Math.max(0, snapshot.teamEditIndex - 1),
});

export function beginHatClueEntry(snapshot: AppSnapshot): HatTransitionResult {
  const error = getHatGameSetupError({
    playerCount: snapshot.players.length,
    teamCount: snapshot.teamCount,
    teams: snapshot.teams,
    players: snapshot.players,
  });
  if (error) return { snapshot: null, error };
  return {
    error: null,
    snapshot: {
      ...snapshot,
      step: "clues",
      clueEntryIndex: 0,
      clueEntryRevealed: false,
      clueSubmissions: syncHatClueSubmissions(snapshot.players, snapshot.clueSubmissions),
    },
  };
}

export function advanceHatClueEntry(snapshot: AppSnapshot): HatTransitionResult {
  const player = snapshot.players[snapshot.clueEntryIndex];
  if (!player) return { snapshot: snapshot, error: null };
  const clues =
    snapshot.clueSubmissions[player.id]?.clues ??
    Array.from({ length: GAME_DEFAULTS.cluesPerPlayer }, () => "");
  if (clues.some((clue) => clue.trim().length === 0)) {
    return {
      snapshot: null,
      error: `Fill in every famous figure before handing the phone on from ${player.name}.`,
    };
  }
  if (snapshot.clueEntryIndex >= snapshot.players.length - 1) {
    return { snapshot: startHatSession(snapshot, snapshot), error: null };
  }
  return {
    error: null,
    snapshot: {
      ...snapshot,
      clueEntryIndex: snapshot.clueEntryIndex + 1,
      clueEntryRevealed: false,
    },
  };
}
