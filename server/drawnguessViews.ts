import { getPrivatePlayerSnapshot, getPublicMatchSnapshot } from "@/domain/drawnguess/engine";
import type { DrawNGuessSyncDto } from "@/domain/drawnguess/types";

import type { Room } from "./roomStore.ts";

export function buildDrawNGuessSyncDto(
  room: Room,
  viewerPlayerId: string,
): DrawNGuessSyncDto | null {
  if (room.gameKind !== "drawnguess" || room.phase !== "playing" || !room.drawnguessMatch) {
    return null;
  }

  return {
    public: getPublicMatchSnapshot(room.drawnguessMatch),
    private: getPrivatePlayerSnapshot(room.drawnguessMatch, viewerPlayerId),
  };
}
