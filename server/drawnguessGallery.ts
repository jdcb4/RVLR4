import type { DrawNGuessPacket } from "@/domain/drawnguess/types";
import type { RoomSyncPayload } from "@/domain/multiplayer/protocol";

// Completed packet arrays are immutable. Weak keys release their IDs with the match.
const galleryIds = new WeakMap<readonly DrawNGuessPacket[], string>();

/** Used only after the client opts in; older clients still receive full snapshots. */
export function prepareDrawNGuessGallerySync(
  sync: RoomSyncPayload,
  previousId?: string,
): {
  sync: RoomSyncPayload;
  galleryId: string | undefined;
} {
  const drawing = sync.drawnguess;
  const packets = drawing?.public.packets;
  if (!drawing || !packets) return { sync, galleryId: undefined };
  let galleryId = galleryIds.get(packets);
  if (!galleryId) {
    galleryId = crypto.randomUUID();
    galleryIds.set(packets, galleryId);
  }
  // The legacy selected packet duplicates an item in the full gallery.
  const { packets: _packets, revealPacket: _selectedPacket, ...progress } = drawing.public;
  return {
    galleryId,
    sync: {
      ...sync,
      drawnguess: {
        ...drawing,
        public: {
          ...progress,
          galleryId,
          ...(galleryId !== previousId ? { packets } : {}),
        },
      },
    } satisfies RoomSyncPayload,
  };
}
