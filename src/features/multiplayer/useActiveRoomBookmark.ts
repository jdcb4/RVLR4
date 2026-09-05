import { useEffect, useRef } from "react";

import type { RoomSyncPayload } from "@/domain/multiplayer/protocol";
import { clearActiveGameBookmark, writeActiveGameBookmark } from "@/multiplayer/activeGameBookmark";

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
