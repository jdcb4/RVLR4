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
        isHost: true,
        teamIndex: null,
        ready: true,
        disconnectedAt: null,
      },
      {
        id: "me",
        name: "Me",
        isHost: false,
        teamIndex: null,
        ready: false,
        disconnectedAt: null,
      },
    ],
    hatClueDrafts: {},
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
