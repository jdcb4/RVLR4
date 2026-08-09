import { GAME_DEFAULTS } from "@/config/hatDefaults";
import { IMPOSTER_MAX_PLAYERS } from "@/config/imposterDefaults";
import {
  MAX_PLAYERS_PER_TEAM,
  MIN_PLAYERS_PER_TEAM,
  TEAM_COUNT_OPTIONS,
} from "@/config/teamRoster";
import { createDefaultDrawNGuessSettings } from "@/domain/drawnguess/engine";
import {
  DRAWNGUESS_MAX_PLAYERS,
  type DrawNGuessMatch,
  type DrawNGuessSettings,
} from "@/domain/drawnguess/types";
import type { HatGameSession } from "@/domain/hat-game/types";
import { clampImposterCount, defaultImposterCount, shuffleWithRng } from "@/domain/imposter/round";
import { createDefaultSettings, createTeamSetups } from "@/domain/whowhatwhere/setup";
import type { GameSettings, MatchState } from "@/domain/whowhatwhere/types";
import type { ImposterSnapshot } from "@/features/imposter/imposterSingleplayerAppTypes";
import { type AvatarId, normalizeAvatarId } from "@/multiplayer/avatarCatalog";

import { generateRoomCode, normalizeRoomCode } from "./codes.ts";
import { generateSecretToken, verifySecretToken } from "./secrets.ts";

export type GameKind = "whowhatwhere" | "hat" | "imposter" | "drawnguess";

export type RoomPhase = "lobby" | "playing" | "ended";

export type RoomPlayer = {
  readonly id: string;
  name: string;
  avatarId: AvatarId;
  readonly secret: string;
  readonly isHost: boolean;
  /** Null for Imposter lobby — unused. */
  teamIndex: number | null;
  ready: boolean;
  disconnectedAt: number | null;
  /**
   * True after this device taps “Pick another game” on final results — they are done with this table.
   * Used with {@link computeResumeEligible} so the hub does not offer a dead resume row.
   */
  optedOutOfResume: boolean;
};

type TeamGameKind = "whowhatwhere" | "hat";

export type Room = {
  readonly code: string;
  readonly gameKind: GameKind;
  hostId: string;
  readonly players: Map<string, RoomPlayer>;
  readonly createdAt: number;
  /** Updated whenever the room is broadcast after a meaningful change (see `broadcastRoom`). */
  lastActivityAt: number;
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
  /** DrawNGuess lobby settings. */
  drawnguessSettings: DrawNGuessSettings;
  /** Mirrors Who What Where ready-handoff for Hat Game (online). */
  wwwReadyReveal?: boolean;
  /** Hat Game: single-step “Start turn” between rounds when true while `stage === 'ready'`. */
  hatReadyReveal?: boolean;
  /** Present once the Who What Where match begins — authoritative server copy. */
  wwwMatch?: MatchState | null;
  /** Present once the Hat Game session begins — authoritative server copy. */
  hatSession?: HatGameSession | null;
  /** Present once Imposter leaves the lobby — mirrors the solo app snapshot shape. */
  imposterSnapshot?: ImposterSnapshot | null;
  /** Present once DrawNGuess leaves the lobby — authoritative server copy. */
  drawnguessMatch?: DrawNGuessMatch | null;
  /** Hat lobby: each player's six famous-figure drafts before the match starts. */
  hatClueDrafts?: Record<string, string[]>;
  /** Results replay: host offered to play again in the same room. */
  replayOfferActive?: boolean;
  /** Player ids who accepted rematch in the current offer round. */
  replayAcceptedPlayerIds?: string[];
  /** Set when a disconnect cancels an in-flight replay offer so clients stop waiting. */
  replayCancelledByDisconnect?: boolean;
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
  const names = setups.map((team) => team.name);

  return shuffleWithRng(names, Math.random);
}

function countTeamPlayers(room: Room): number[] {
  const counts = Array.from({ length: room.teamCount }, () => 0);

  for (const player of room.players.values()) {
    if (player.teamIndex !== null && player.teamIndex >= 0 && player.teamIndex < counts.length) {
      counts[player.teamIndex] += 1;
    }
  }

  return counts;
}

function clearActiveMatchState(room: Room): void {
  room.wwwMatch = undefined;
  room.hatSession = undefined;
  room.imposterSnapshot = undefined;
  room.drawnguessMatch = undefined;
  room.wwwReadyReveal = undefined;
  room.hatReadyReveal = undefined;
  room.replayOfferActive = undefined;
  room.replayAcceptedPlayerIds = undefined;
  room.replayCancelledByDisconnect = undefined;
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
      resumeEligible: computeResumeEligible(room),
    };
  }

  createRoom(args: { gameKind: GameKind; hostName: string; avatarId?: unknown }): {
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
    const avatarId = normalizeAvatarId(args.avatarId);

    const baseTeams = 2;
    const room: Room = {
      code,
      gameKind: args.gameKind,
      hostId,
      players: new Map(),
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      phase: "lobby",
      teamCount: isTeamGame(args.gameKind) ? baseTeams : 0,
      teamNames: isTeamGame(args.gameKind) ? initialTeamNames(baseTeams) : [],
      wwwSettings: createDefaultSettings(),
      hatTurnDurationSeconds: GAME_DEFAULTS.turnDurationSeconds,
      hatSkipsPerTurn: GAME_DEFAULTS.skipsPerTurn,
      imposterPlayerCount: 6,
      imposterImposterCount: defaultImposterCount(6),
      drawnguessSettings: createDefaultDrawNGuessSettings(),
      ...(args.gameKind === "hat" ? { hatClueDrafts: {} as Record<string, string[]> } : {}),
    };

    const hostPlayer: RoomPlayer = {
      id: hostId,
      name: trimmedName,
      avatarId,
      secret,
      isHost: true,
      teamIndex: isTeamGame(args.gameKind) ? 0 : null,
      ready: false,
      disconnectedAt: null,
      optedOutOfResume: false,
    };

    room.players.set(hostId, hostPlayer);

    if (args.gameKind === "hat" && room.hatClueDrafts) {
      room.hatClueDrafts[hostId] = Array.from({ length: GAME_DEFAULTS.cluesPerPlayer }, () => "");
    }

    if (args.gameKind === "imposter") {
      clampImposterLobbyCounts(room);
    }

    this.roomsByCode.set(code, room);

    return { room, hostPlayer };
  }

  joinRoom(args: { code: string; name: string; avatarId?: unknown }): {
    room: Room;
    player: RoomPlayer;
  } {
    const code = normalizeRoomCode(args.code);
    const room = this.roomsByCode.get(code);

    if (!room || room.phase !== "lobby") {
      throw new Error("That join code is not available.");
    }

    const trimmedName = args.name.trim().slice(0, 32) || "Player";
    const playerId = crypto.randomUUID();
    const secret = generateSecretToken();
    const avatarId = normalizeAvatarId(args.avatarId);

    const player: RoomPlayer = {
      id: playerId,
      name: trimmedName,
      avatarId,
      secret,
      isHost: false,
      teamIndex: null,
      ready: false,
      disconnectedAt: null,
      optedOutOfResume: false,
    };

    if (room.gameKind === "imposter") {
      if (room.players.size >= IMPOSTER_MAX_PLAYERS) {
        throw new Error("This Imposter room is full.");
      }
      player.teamIndex = null;
    } else if (room.gameKind === "drawnguess") {
      if (room.players.size >= DRAWNGUESS_MAX_PLAYERS) {
        throw new Error("This DrawNGuess room is full.");
      }
      player.teamIndex = null;
    } else {
      player.teamIndex = pickSmallestTeamIndex(room);
      const nextCounts = previewCountsAfterJoin(room, player.teamIndex);

      for (const count of nextCounts) {
        if (count > MAX_PLAYERS_PER_TEAM) {
          throw new Error(`Teams can have at most ${MAX_PLAYERS_PER_TEAM} players for this game.`);
        }
      }
    }

    room.players.set(playerId, player);

    if (room.gameKind === "hat") {
      room.hatClueDrafts ??= {};
      room.hatClueDrafts[playerId] = Array.from({ length: GAME_DEFAULTS.cluesPerPlayer }, () => "");
    }

    if (room.gameKind === "imposter") {
      clampImposterLobbyCounts(room);
    }

    return { room, player };
  }

  getRoom(codeInput: string): Room | null {
    const code = normalizeRoomCode(codeInput);

    return this.roomsByCode.get(code) ?? null;
  }

  /** Marks the room as recently active (used by `broadcastRoom` after mutations). */
  touchRoomActivity(codeInput: string): void {
    const room = this.getRoom(codeInput);

    if (room) {
      room.lastActivityAt = Date.now();
    }
  }

  authenticate(args: { code: string; playerId: string; secret: string }): RoomPlayer | null {
    const room = this.getRoom(args.code);

    if (!room) {
      return null;
    }

    const player = room.players.get(args.playerId);

    if (!player || !verifySecretToken(player.secret, args.secret)) {
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
  /** False when everyone is away or everyone left via “Pick another game” — hide hub resume. */
  readonly resumeEligible: boolean;
};

/** Hub resume row: in-progress table with at least one connected player who has not left for the hub. */
export function computeResumeEligible(room: Room): boolean {
  if (room.phase !== "playing" || room.players.size === 0) {
    return false;
  }

  const players = [...room.players.values()];
  const someoneConnected = players.some((player) => player.disconnectedAt === null);

  if (!someoneConnected) {
    return false;
  }

  return players.some((player) => !player.optedOutOfResume);
}

/**
 * Close the in-memory match after everyone tapped “Pick another game” (no one left to resume).
 * Keeps the room row briefly so reconnecting clients see `phase: ended` instead of a hard 404.
 */
export function archiveRoomAfterAllPlayersOptedOut(room: Room): void {
  room.phase = "ended";
  clearActiveMatchState(room);
}

function pickSmallestTeamIndex(room: Room): number {
  const counts = countTeamPlayers(room);

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
  const counts = countTeamPlayers(room);

  if (newPlayerTeamIndex >= 0 && newPlayerTeamIndex < counts.length) {
    counts[newPlayerTeamIndex] += 1;
  }

  return counts;
}

/** Keeps Imposter counts aligned with actual lobby size (no manual roster target). */
export function clampImposterLobbyCounts(room: Room): void {
  if (room.gameKind !== "imposter") {
    return;
  }

  room.imposterPlayerCount = room.players.size;

  room.imposterImposterCount = clampImposterCount(room.players.size, room.imposterImposterCount);
}

export function resetLobbyAfterReplay(room: Room): void {
  room.phase = "lobby";
  clearActiveMatchState(room);

  for (const player of room.players.values()) {
    player.ready = false;
    player.optedOutOfResume = false;
  }

  if (room.gameKind === "imposter") {
    clampImposterLobbyCounts(room);
  }
}

/** Validates minimum players per team when starting (called from game layer). */
export function assertTeamLobbyReady(room: Room): void {
  if (!isTeamGame(room.gameKind)) {
    return;
  }

  const counts = countTeamPlayers(room);

  for (let index = 0; index < counts.length; index += 1) {
    const count = counts[index] ?? 0;

    if (count < MIN_PLAYERS_PER_TEAM) {
      throw new Error(
        `Team ${index + 1} needs at least ${MIN_PLAYERS_PER_TEAM} players before you can start.`,
      );
    }
  }
}
