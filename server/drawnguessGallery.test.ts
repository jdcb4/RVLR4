import { describe, expect, it } from "vitest";

import { advanceTurn } from "@/domain/drawnguess/engine";
import { mergeRoomSync } from "@/multiplayer/mergeRoomSync";

import { prepareDrawNGuessGallerySync } from "./drawnguessGallery.ts";
import { startDrawNGuessMatch } from "./drawnguessRuntime.ts";
import { RoomStore } from "./roomStore.ts";
import { buildRoomSync } from "./sync.ts";

function gallery() {
  const store = new RoomStore();
  const { room, hostPlayer } = store.createRoom({ gameKind: "drawnguess", hostName: "Host" });
  store.joinRoom({ code: room.code, name: "Guest" });
  store.joinRoom({ code: room.code, name: "Third" });
  startDrawNGuessMatch(room, 1000);
  for (let i = 0; i < 3; i++)
    room.drawnguessMatch = advanceTurn(room.drawnguessMatch!, 100_000 * (i + 1));
  return { room, hostPlayer };
}

describe("completed drawing gallery transport", () => {
  it("sends one full gallery then small replay updates that reconstruct the same content", () => {
    const { room, hostPlayer } = gallery();
    const original = buildRoomSync(room, hostPlayer.id);
    const first = prepareDrawNGuessGallerySync(original);
    expect(first.sync.drawnguess?.public.packets).toEqual(original.drawnguess?.public.packets);
    expect(first.sync.drawnguess?.public.revealPacket).toBeUndefined();
    const update = { ...original, replay: { ...original.replay, offerActive: true } };
    const next = prepareDrawNGuessGallerySync(update, first.galleryId);
    expect(next.sync.drawnguess?.public.packets).toBeUndefined();
    expect(JSON.stringify(next.sync).length).toBeLessThan(JSON.stringify(first.sync).length);
    expect(
      mergeRoomSync(JSON.parse(JSON.stringify(first.sync)), JSON.parse(JSON.stringify(next.sync))),
    ).toEqual({ ...first.sync, replay: update.replay });
    expect(original.drawnguess?.public.revealPacket).toBeDefined();
    expect(prepareDrawNGuessGallerySync(original).sync.drawnguess?.public.packets).toBeDefined();
  });

  it("requires full data for a different gallery, viewer, room, or missing cache", () => {
    const { room, hostPlayer } = gallery();
    const full = prepareDrawNGuessGallerySync(buildRoomSync(room, hostPlayer.id));
    const delta = prepareDrawNGuessGallerySync(
      buildRoomSync(room, hostPlayer.id),
      full.galleryId,
    ).sync;
    expect(mergeRoomSync(null, delta)).toBeNull();
    expect(mergeRoomSync({ ...full.sync, code: "ZZZZZZ" }, delta)).toBeNull();
    expect(
      mergeRoomSync({ ...full.sync, you: { playerId: "other", isHost: false } }, delta),
    ).toBeNull();
    room.drawnguessMatch = {
      ...room.drawnguessMatch!,
      packets: [...room.drawnguessMatch!.packets],
    };
    const newGallery = prepareDrawNGuessGallerySync(
      buildRoomSync(room, hostPlayer.id),
      full.galleryId,
    );
    expect(newGallery.galleryId).not.toBe(full.galleryId);
    expect(newGallery.sync.drawnguess?.public.packets).toBeDefined();
    expect(mergeRoomSync(full.sync, newGallery.sync)).toBe(newGallery.sync);
  });

  it("drops gallery identity in lobby and keeps older full snapshots usable", () => {
    const { room, hostPlayer } = gallery();
    const legacy = buildRoomSync(room, hostPlayer.id);
    expect(mergeRoomSync(null, legacy)).toBe(legacy);
    room.phase = "lobby";
    const lobby = buildRoomSync(room, hostPlayer.id);
    expect(prepareDrawNGuessGallerySync(lobby, "old")).toEqual({
      sync: lobby,
      galleryId: undefined,
    });
    room.phase = "playing";
    startDrawNGuessMatch(room);
    const playing = buildRoomSync(room, hostPlayer.id);
    expect(prepareDrawNGuessGallerySync(playing).galleryId).toBeUndefined();
  });
});
