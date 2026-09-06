import {
  evaluateLobbyStartReadiness,
  type LobbyStartReadiness,
} from "@/domain/multiplayer/lobbyReadiness";

import type { Room } from "./roomStore.ts";

export function getRoomLobbyStartReadiness(room: Room): LobbyStartReadiness {
  return evaluateLobbyStartReadiness({
    gameKind: room.gameKind,
    teamCount: room.teamCount,
    teamNames: room.teamNames,
    players: [...room.players.values()],
    hatClueDrafts: room.hatClueDrafts ?? {},
  });
}

export function assertRoomLobbyStartReady(room: Room): void {
  const blocker = getRoomLobbyStartReadiness(room).blockers[0];

  if (blocker) {
    throw new Error(blocker.message);
  }
}
