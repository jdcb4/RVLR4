import { GAME_DEFAULTS } from "@/config/hatGameDefaults";
import {
  applyHatGameAction,
  createHatGameSession,
  getHatGameContext,
} from "@/domain/hat-game/engine";
import { getHatGameSetupError } from "@/domain/hat-game/setup";
import type { HatGameAction, HatGameSession } from "@/domain/hat-game/types";
import type { TeamSetup } from "@/domain/whowhatwhere/types";

import { buildServerHatClueSubmissions } from "./hatClues.ts";
import { buildTeamSetupsFromLobby } from "./lobbyHelpers.ts";
import { assertTeamLobbyReady, type Room } from "./roomStore.ts";

function playersAndTeamsFromSetups(setups: readonly TeamSetup[]) {
  const teams = setups.map((setup) => ({
    id: setup.id,
    name: setup.name,
    score: 0,
  }));

  let seat = 0;
  const players = setups.flatMap((setup) =>
    setup.players.map((player) => ({
      id: player.id,
      name: player.name,
      teamId: setup.id,
      seat: seat++,
    })),
  );

  return { teams, players };
}

function commitHatSession(room: Room, session: HatGameSession) {
  room.hatSession = session;
  room.hatReadyReveal = session.stage === "ready";
}

function requireHatSession(room: Room): HatGameSession {
  if (room.gameKind !== "hat" || !room.hatSession) {
    throw new Error("No Hat Game session is active.");
  }

  return room.hatSession;
}

function assertHatDescriber(room: Room, actorId: string) {
  const session = requireHatSession(room);
  const context = getHatGameContext(session);

  if (context.activeDescriberId !== actorId) {
    throw new Error("Only the active describer can do that.");
  }
}

function runHatAction(room: Room, action: HatGameAction): HatGameSession {
  const session = requireHatSession(room);
  const next = applyHatGameAction(session, action);

  if ("error" in next) {
    throw new Error(next.error);
  }

  commitHatSession(room, next);

  return next;
}

export function startHatMatch(room: Room) {
  assertTeamLobbyReady(room);
  const setups = buildTeamSetupsFromLobby(room);
  const { teams, players } = playersAndTeamsFromSetups(setups);
  const setupError = getHatGameSetupError({
    playerCount: players.length,
    teamCount: teams.length,
    teams,
    players,
  });

  if (setupError) {
    throw new Error(setupError);
  }

  const clueSubmissions = buildServerHatClueSubmissions(players, Math.random);

  const session = createHatGameSession({
    players,
    teams,
    config: {
      ...GAME_DEFAULTS,
      turnDurationSeconds: room.hatTurnDurationSeconds,
      skipsPerTurn: room.hatSkipsPerTurn,
    },
    clueSubmissions,
    rng: Math.random,
  });

  room.hatSession = session;
  room.hatReadyReveal = true;
  room.phase = "playing";
}

export function applyHatStartTurn(room: Room, actorId: string) {
  assertHatDescriber(room, actorId);
  const session = requireHatSession(room);

  if (session.stage !== "ready") {
    throw new Error("The game is not waiting on a new turn.");
  }

  runHatAction(room, { type: "start-turn" });
}

export function applyHatEndTurn(room: Room, actorId: string) {
  assertHatDescriber(room, actorId);
  runHatAction(room, { type: "end-turn" });
}

/** Auto-expire when the server clock passes `activeTurn.endsAt` (no trusted client timer). */
export function applyHatExpireTurn(room: Room) {
  runHatAction(room, { type: "end-turn" });
}

export function applyHatMarkCorrect(room: Room, actorId: string) {
  assertHatDescriber(room, actorId);
  runHatAction(room, { type: "mark-correct" });
}

export function applyHatSkipClue(room: Room, actorId: string) {
  assertHatDescriber(room, actorId);
  runHatAction(room, { type: "skip-clue" });
}

export function applyHatReturnSkipped(room: Room, actorId: string, poolIndex?: number) {
  assertHatDescriber(room, actorId);
  runHatAction(room, {
    type: "return-skipped-clue",
    payload: poolIndex !== undefined ? { poolIndex } : {},
  });
}

export function applyHatViewResults(room: Room) {
  const session = requireHatSession(room);

  if (session.stage !== "finalSummary") {
    throw new Error("Final scores are not unlocked yet.");
  }

  runHatAction(room, { type: "view-results" });
}
