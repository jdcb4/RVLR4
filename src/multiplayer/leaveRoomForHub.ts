import type { NavigateFunction } from "react-router-dom";

import { clearActiveGameBookmark } from "@/multiplayer/activeGameBookmark";

/**
 * Tell the server this seat is done with the table (Pick another game), clear the local
 * “resume” bookmark, then return to the hub.
 */
export async function leaveMultiplayerRoomForHub(
  emitWithAck: (
    event: string,
    body?: unknown,
  ) => Promise<{ ok?: boolean; error?: string } | undefined>,
  navigate: NavigateFunction,
): Promise<void> {
  try {
    await emitWithAck("room:optOutResume", {});
  } finally {
    clearActiveGameBookmark();
    navigate("/");
  }
}
