import { createDefaultDrawNGuessSettings } from "@/domain/drawnguess/engine";
import { createDefaultSettings } from "@/domain/whowhatwhere/setup";
import type { LobbyDto, RoomSyncPayload } from "@/multiplayer/roomTypes";

export function buildLobby(overrides: Partial<LobbyDto> = {}): LobbyDto {
  return {
    teamCount: 0,
    teamNames: [],
    wwwSettings: createDefaultSettings(),
    hatTurnDurationSeconds: 60,
    hatSkipsPerTurn: 3,
    imposterPlayerCount: 2,
    imposterImposterCount: 1,
    drawnguessSettings: createDefaultDrawNGuessSettings(),
    players: [
      {
        id: "host",
        name: "Host",
        avatarId: "bear",
        isHost: true,
        teamIndex: null,
        ready: true,
        disconnectedAt: null,
      },
      {
        id: "me",
        name: "Me",
        avatarId: "cat",
        isHost: false,
        teamIndex: null,
        ready: false,
        disconnectedAt: null,
      },
    ],
    myHatClueDrafts: [],
    startReadiness: {
      canStart: false,
      blockers: [
        {
          code: "player-count",
          message: "Imposter needs 4–10 players (currently 2).",
        },
      ],
    },
    ...overrides,
  };
}

export function buildRoomSync(overrides: Partial<RoomSyncPayload> = {}): RoomSyncPayload {
  const lobby = buildLobby();

  return {
    code: "ABC123",
    gameKind: "imposter",
    phase: "lobby",
    you: {
      playerId: "me",
      isHost: false,
    },
    lobby,
    www: null,
    hat: null,
    imposter: null,
    drawnguess: null,
    replay: {
      offerActive: false,
      acceptedIds: [],
      cancelledByDisconnect: false,
    },
    ...overrides,
  };
}
