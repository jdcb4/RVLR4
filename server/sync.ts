import type { DrawNGuessSyncDto } from "@/domain/drawnguess/types";
import type { HatGameSession } from "@/domain/hat-game/types";
import type { LobbyStartReadiness } from "@/domain/multiplayer/lobbyReadiness";
import type { MatchState } from "@/domain/whowhatwhere/types";

import { buildDrawNGuessSyncDto } from "./drawnguessViews.ts";
import {
  canHatReturnSkipped,
  classifyHatRole,
  type HatPeerRole,
  projectHatSessionForViewer,
  shouldShowHatTurnFooter,
} from "./hatViews.ts";
import { buildImposterSyncDto, type ImposterSyncDto } from "./imposterViews.ts";
import { getRoomLobbyStartReadiness } from "./lobbyReadiness.ts";
import type { GameKind, Room, RoomPhase, RoomPlayer } from "./roomStore.ts";
import {
  canReturnSkippedWords,
  classifyWhoWhatWhereRole,
  projectWhoWhatWhereMatch,
  shouldShowWhoWhatWhereTurnFooter,
  type WhoWhatWherePeerRole,
} from "./whoWhatWhereViews.ts";

export type LobbyPlayerDto = {
  readonly id: string;
  readonly name: string;
  readonly avatarId: RoomPlayer["avatarId"];
  readonly isHost: boolean;
  readonly teamIndex: number | null;
  readonly ready: boolean;
  readonly disconnectedAt: number | null;
};

export type LobbyDto = {
  readonly teamCount: number;
  readonly teamNames: readonly string[];
  readonly wwwSettings: Room["wwwSettings"];
  readonly hatTurnDurationSeconds: number;
  readonly hatSkipsPerTurn: number;
  readonly imposterPlayerCount: number;
  readonly imposterImposterCount: number;
  readonly drawnguessSettings: Room["drawnguessSettings"];
  readonly players: readonly LobbyPlayerDto[];
  /** Hat only — each player's six famous-figure drafts. */
  readonly hatClueDrafts: Record<string, readonly string[]>;
  readonly startReadiness: LobbyStartReadiness;
};

export type WhoWhatWhereSyncDto = {
  readonly match: MatchState;
  readonly role: WhoWhatWherePeerRole;
  readonly readyReveal: boolean;
  readonly showTurnFooter: boolean;
  readonly canReturnSkipped: boolean;
};

export type HatSyncDto = {
  readonly session: HatGameSession;
  readonly role: HatPeerRole;
  readonly readyReveal: boolean;
  readonly showTurnFooter: boolean;
  readonly canReturnSkipped: boolean;
};

export type { ImposterSyncDto };
export type { DrawNGuessSyncDto };

export type RoomSyncPayload = {
  readonly code: string;
  readonly gameKind: GameKind;
  readonly phase: RoomPhase;
  readonly you: {
    readonly playerId: string;
    readonly isHost: boolean;
  };
  readonly lobby: LobbyDto | null;
  readonly www: WhoWhatWhereSyncDto | null;
  readonly hat: HatSyncDto | null;
  readonly imposter: ImposterSyncDto | null;
  readonly drawnguess: DrawNGuessSyncDto | null;
  readonly replay: {
    readonly offerActive: boolean;
    readonly acceptedIds: readonly string[];
  };
};

function lobbyPlayers(room: Room): LobbyPlayerDto[] {
  return [...room.players.values()].map((player) => toLobbyPlayerDto(player));
}

function toLobbyPlayerDto(player: RoomPlayer): LobbyPlayerDto {
  return {
    id: player.id,
    name: player.name,
    avatarId: player.avatarId,
    isHost: player.isHost,
    teamIndex: player.teamIndex,
    ready: player.ready,
    disconnectedAt: player.disconnectedAt,
  };
}

function buildLobbyDto(room: Room): LobbyDto {
  return {
    teamCount: room.teamCount,
    teamNames: room.teamNames,
    wwwSettings: room.wwwSettings,
    hatTurnDurationSeconds: room.hatTurnDurationSeconds,
    hatSkipsPerTurn: room.hatSkipsPerTurn,
    imposterPlayerCount: room.imposterPlayerCount,
    imposterImposterCount: room.imposterImposterCount,
    drawnguessSettings: room.drawnguessSettings,
    players: lobbyPlayers(room),
    hatClueDrafts: room.hatClueDrafts ?? {},
    startReadiness: getRoomLobbyStartReadiness(room),
  };
}

export function buildRoomSync(room: Room, viewerPlayerId: string): RoomSyncPayload {
  const viewer = room.players.get(viewerPlayerId);

  if (!viewer) {
    throw new Error("Player not part of this room.");
  }

  const lobby = room.phase === "lobby" ? buildLobbyDto(room) : null;

  let www: WhoWhatWhereSyncDto | null = null;

  if (room.gameKind === "whowhatwhere" && room.phase === "playing" && room.wwwMatch) {
    const projected = projectWhoWhatWhereMatch(room.wwwMatch, viewerPlayerId);

    www = {
      match: projected,
      role: classifyWhoWhatWhereRole(room.wwwMatch, viewerPlayerId),
      readyReveal: Boolean(room.wwwReadyReveal),
      showTurnFooter: shouldShowWhoWhatWhereTurnFooter(room.wwwMatch, viewerPlayerId),
      canReturnSkipped: canReturnSkippedWords(room.wwwMatch, viewerPlayerId),
    };
  }

  let hat: HatSyncDto | null = null;

  if (room.gameKind === "hat" && room.phase === "playing" && room.hatSession) {
    const projected = projectHatSessionForViewer(room.hatSession, viewerPlayerId);

    hat = {
      session: projected,
      role: classifyHatRole(room.hatSession, viewerPlayerId),
      readyReveal: Boolean(room.hatReadyReveal),
      showTurnFooter: shouldShowHatTurnFooter(room.hatSession, viewerPlayerId),
      canReturnSkipped: canHatReturnSkipped(room.hatSession, viewerPlayerId),
    };
  }

  let imposter: ImposterSyncDto | null = null;

  if (room.gameKind === "imposter" && room.phase === "playing" && room.imposterSnapshot) {
    imposter = buildImposterSyncDto(room.imposterSnapshot, viewerPlayerId);
  }

  const drawnguess = buildDrawNGuessSyncDto(room, viewerPlayerId);

  return {
    code: room.code,
    gameKind: room.gameKind,
    phase: room.phase,
    you: {
      playerId: viewer.id,
      isHost: viewer.isHost,
    },
    lobby,
    www,
    hat,
    imposter,
    drawnguess,
    replay: {
      offerActive: Boolean(room.replayOfferActive),
      acceptedIds: room.replayAcceptedPlayerIds ?? [],
      cancelledByDisconnect: Boolean(room.replayCancelledByDisconnect),
    },
  };
}
