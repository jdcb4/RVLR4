import { useEffect, useRef } from "react";

import { clearActiveGameBookmark, writeActiveGameBookmark } from "@/multiplayer/activeGameBookmark";
import type { RoomSyncPayload } from "@/multiplayer/roomTypes";

export function useActiveRoomBookmark(sync: RoomSyncPayload | null) {
  const playingBookmarkCommittedRef = useRef(false);

  useEffect(() => {
    if (!sync) {
      return undefined;
    }

    if (sync.phase === "lobby" || sync.phase === "ended") {
      playingBookmarkCommittedRef.current = false;
      clearActiveGameBookmark();

      return undefined;
    }

    if (sync.phase === "playing" && !playingBookmarkCommittedRef.current) {
      playingBookmarkCommittedRef.current = true;
      writeActiveGameBookmark({
        code: sync.code,
        gameKind: sync.gameKind,
        startedAtIso: new Date().toISOString(),
      });
    }

    return undefined;
  }, [sync]);
}
