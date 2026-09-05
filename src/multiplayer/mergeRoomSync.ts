import type { RoomSyncPayload } from "@/domain/multiplayer/protocol";

/** Null asks for a fresh bind when a partial update has no matching local gallery. */
export function mergeRoomSync(
  previous: RoomSyncPayload | null,
  incoming: RoomSyncPayload,
): RoomSyncPayload | null {
  const drawing = incoming.drawnguess;
  if (!drawing?.public.galleryId || drawing.public.packets) return incoming;
  const cached = previous?.drawnguess?.public;
  if (
    previous?.code !== incoming.code ||
    previous?.you.playerId !== incoming.you.playerId ||
    cached?.galleryId !== drawing.public.galleryId ||
    !cached.packets
  )
    return null;
  return {
    ...incoming,
    drawnguess: { ...drawing, public: { ...drawing.public, packets: cached.packets } },
  };
}
