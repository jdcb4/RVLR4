import { GAME_DEFAULTS } from "@/config/hatGameDefaults";
import {
  IMPOSTER_MAX_PLAYERS,
  IMPOSTER_MIN_PLAYERS,
} from "@/config/imposterDefaults";
import {
  MAX_PLAYERS_PER_TEAM,
  MIN_PLAYERS_PER_TEAM,
  TEAM_COUNT_OPTIONS,
} from "@/config/teamRoster";
import type { HatGameSession } from "@/domain/hat-game/types";
import { clampImposterCount, defaultImposterCount } from "@/domain/imposter/round";
import { createDefaultSettings, createTeamSetups } from "@/domain/whowhatwhere/setup";
import type { GameSettings, MatchState } from "@/domain/whowhatwhere/types";
import type { ImposterSnapshot } from "@/features/imposter/imposterAppTypes";

import { generateRoomCode, normalizeRoomCode } from "./codes.ts";
import { generateSecretToken } from "./secrets.ts";

export type GameKind = "whowhatwhere" | "hat" | "imposter";

export type RoomPhase = "lobby" | "playing" | "ended";

export type RoomPlayer = {
  readonly id: string;
  name: string;
  readonly secret: string;
  readonly isHost: boolean;
  /** Null for Imposter lobby — unused. */
  teamIndex: number | null;
  ready: boolean;
  disconnectedAt: number | null;
};

export type TeamGameKind = Exclude<GameKind, "imposter">;

export type Room = {
  readonly code: string;
  readonly gameKind: GameKind;
  hostId: string;
  readonly players: Map<string, RoomPlayer>;
  readonly createdAt: number;
  phase: RoomPhase;
  /** 2–4 for team games; Imposter stores `0` (unused). */
  teamCount: number;
  /** One display name per team bench (team games only). */
  teamNames: string[];
  /** Who What Where settings configured in the lobby (host). */
  wwwSettings: GameSettings;
  /** Hat Game numeric prefs mirrored from pass-and-play defaults. */
  hatTurnDurationSeconds: number;
  hatSkipsPerTurn: number;
  /** Imposter lobby — host-controlled roster size. */
  imposterPlayerCount: number;
  imposterImposterCount: number;
  /** Mirrors the pass-and-play “Describer ready” gate before loading words. */
  wwwReadyReveal?: boolean;
  /** Present once the Who What Where match begins — authoritative server copy. */
  wwwMatch?: MatchState | null;
  /** Present once the Hat Game session begins — authoritative server copy. */
  hatSession?: HatGameSession | null;
  /** Present once Imposter leaves the lobby — mirrors the solo app snapshot shape. */
  imposterSnapshot?: ImposterSnapshot | null;
};

const MAX_ROOMS = 500;

function isTeamGame(kind: GameKind): kind is TeamGameKind {
  return kind === "whowhatwhere" || kind === "hat";
}

function initialTeamNames(teamCount: number): string[] {
  const safeCount = TEAM_COUNT_OPTIONS.includes(teamCount as 2 | 3 | 4)
    ? (teamCount as 2 | 3 | 4)
    : 2;
  const setups = createTeamSetups(safeCount);

  return setups.map((team) => team.name);
}

export class RoomStore {
  private readonly roomsByCode = new Map<string, Room>();

  peek(codeInput: string): PublicRoomSummary | null {
    const code = normalizeRoomCode(codeInput);
    const room = this.roomsByCode.get(code);

    if (!room) {
      return null;
    }

    const host = room.players.get(room.hostId);

    return {
      code: room.code,
      gameKind: room.gameKind,
      hostName: host?.name ?? "Host",
      playerCount: room.players.size,
      phase: room.phase,
    };
  }

  createRoom(args: { gameKind: GameKind; hostName: string }): {
    room: Room;
    hostPlayer: RoomPlayer;
  } {
    if (this.roomsByCode.size >= MAX_ROOMS) {
      throw new Error("Server is busy — try again in a minute.");
    }

    let code = generateRoomCode();

    while (this.roomsByCode.has(code)) {
      code = generateRoomCode();
    }

    const hostId = crypto.randomUUID();
    const secret = generateSecretToken();
    const trimmedName = args.hostName.trim().slice(0, 32) || "Host";

    const baseTeams = 2;
    const room: Room = {
      code,
      gameKind: args.gameKind,
      hostId,
      players: new Map(),
      createdAt: Date.now(),
      phase: "lobby",
      teamCount: isTeamGame(args.gameKind) ? baseTeams : 0,
      teamNames: isTeamGame(args.gameKind) ? initialTeamNames(baseTeams) : [],
      wwwSettings: createDefaultSettings(),
      hatTurnDurationSeconds: GAME_DEFAULTS.turnDurationSeconds,
      hatSkipsPerTurn: GAME_DEFAULTS.skipsPerTurn,
      imposterPlayerCount: 6,
      imposterImposterCount: defaultImposterCount(6),
    };

    const hostPlayer: RoomPlayer = {
      id: hostId,
      name: trimmedName,
      secret,
      isHost: true,
      teamIndex: isTeamGame(args.gameKind) ? 0 : null,
      ready: false,
      disconnectedAt: null,
    };

    room.players.set(hostId, hostPlayer);
    this.roomsByCode.set(code, room);

    return { room, hostPlayer };
  }

  joinRoom(args: {
    code: string;
    name: string;
  }): { room: Room; player: RoomPlayer } {
    const code = normalizeRoomCode(args.code);
    const room = this.roomsByCode.get(code);

    if (!room || room.phase !== "lobby") {
      throw new Error("That join code is not available.");
    }

    const trimmedName = args.name.trim().slice(0, 32) || "Player";
    const playerId = crypto.randomUUID();
    const secret = generateSecretToken();

    const player: RoomPlayer = {
      id: playerId,
      name: trimmedName,
      secret,
      isHost: false,
      teamIndex: null,
      ready: false,
      disconnectedAt: null,
    };

    if (room.gameKind === "imposter") {
      if (room.players.size >= IMPOSTER_MAX_PLAYERS) {
        throw new Error("This Imposter room is full.");
      }
      player.teamIndex = null;
    } else {
      player.teamIndex = pickSmallestTeamIndex(room);
      const nextCounts = previewCountsAfterJoin(room, player.teamIndex);

      for (const count of nextCounts) {
        if (count > MAX_PLAYERS_PER_TEAM) {
          throw new Error(
            `Teams can have at most ${MAX_PLAYERS_PER_TEAM} players for this game.`,
          );
        }
      }
    }

    room.players.set(playerId, player);

    return { room, player };
  }

  getRoom(codeInput: string): Room | null {
    const code = normalizeRoomCode(codeInput);

    return this.roomsByCode.get(code) ?? null;
  }

  authenticate(args: {
    code: string;
    playerId: string;
    secret: string;
  }): RoomPlayer | null {
    const room = this.getRoom(args.code);

    if (!room) {
      return null;
    }

    const player = room.players.get(args.playerId);

    if (!player || player.secret !== args.secret) {
      return null;
    }

    return player;
  }

  deleteRoom(codeInput: string): void {
    const code = normalizeRoomCode(codeInput);
    this.roomsByCode.delete(code);
  }

  /** Enumerates active rooms so background timers can advance timed turns. */
  listRooms(): readonly Room[] {
    return [...this.roomsByCode.values()];
  }
}

export type PublicRoomSummary = {
  readonly code: string;
  readonly gameKind: GameKind;
  readonly hostName: string;
  readonly playerCount: number;
  readonly phase: RoomPhase;
};

function pickSmallestTeamIndex(room: Room): number {
  const counts = Array.from({ length: room.teamCount }, () => 0);

  for (const player of room.players.values()) {
    if (
      player.teamIndex !== null &&
      player.teamIndex >= 0 &&
      player.teamIndex < counts.length
    ) {
      counts[player.teamIndex] += 1;
    }
  }

  let bestIndex = 0;
  let bestCount = counts[0] ?? 0;

  for (let index = 1; index < counts.length; index += 1) {
    const count = counts[index] ?? 0;

    if (count < bestCount) {
      bestCount = count;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function previewCountsAfterJoin(room: Room, newPlayerTeamIndex: number): number[] {
  const counts = Array.from({ length: room.teamCount }, () => 0);

  for (const player of room.players.values()) {
    if (
      player.teamIndex !== null &&
      player.teamIndex >= 0 &&
      player.teamIndex < counts.length
    ) {
      counts[player.teamIndex] += 1;
    }
  }

  if (newPlayerTeamIndex >= 0 && newPlayerTeamIndex < counts.length) {
    counts[newPlayerTeamIndex] += 1;
  }

  return counts;
}

/** Host adjusts Imposter counts using the same clamps as the solo app. */
export function clampImposterLobbyCounts(room: Room): void {
  if (room.gameKind !== "imposter") {
    return;
  }

  room.imposterPlayerCount = Math.min(
    IMPOSTER_MAX_PLAYERS,
    Math.max(IMPOSTER_MIN_PLAYERS, room.imposterPlayerCount),
  );
  room.imposterImposterCount = clampImposterCount(
    room.imposterPlayerCount,
    room.imposterImposterCount,
  );
}

/** Validates minimum players per team when starting (called from game layer). */
export function assertTeamLobbyReady(room: Room): void {
  if (!isTeamGame(room.gameKind)) {
    return;
  }

  const counts = Array.from({ length: room.teamCount }, () => 0);

  for (const player of room.players.values()) {
    if (
      player.teamIndex !== null &&
      player.teamIndex >= 0 &&
      player.teamIndex < counts.length
    ) {
      counts[player.teamIndex] += 1;
    }
  }

  for (let index = 0; index < counts.length; index += 1) {
    const count = counts[index] ?? 0;

    if (count < MIN_PLAYERS_PER_TEAM) {
      throw new Error(
        `Team ${index + 1} needs at least ${MIN_PLAYERS_PER_TEAM} players before you can start.`,
      );
    }
  }
}
