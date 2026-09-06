import { describe, expect, it, vi } from "vitest";

import { buildMultiplayerReplayUi } from "./replayUi";

describe("replay recovery controls", () => {
  it("enables a fresh host offer after the disconnected-player notice clears", () => {
    const args = {
      offerActive: false,
      acceptedIds: [],
      cancelledByDisconnect: true,
      viewerId: "host",
      isHost: true,
      emitWithAck: vi.fn(async () => ({ ok: true })),
    };
    expect(buildMultiplayerReplayUi(args).mode).toBe("inactive");
    expect(buildMultiplayerReplayUi({ ...args, cancelledByDisconnect: false }).mode).toBe(
      "hostOffer",
    );
  });
  it("accepts only the offer shown on the player's screen", () => {
    const emitWithAck = vi.fn(async () => ({ ok: true }));
    const ui = buildMultiplayerReplayUi({
      offerActive: true,
      offerId: "shown-offer",
      acceptedIds: [],
      cancelledByDisconnect: false,
      viewerId: "guest",
      isHost: false,
      emitWithAck,
    });
    expect(ui.mode).toBe("joinReplay");
    if (ui.mode !== "joinReplay") throw new Error("Missing replay action");
    ui.onClick();
    expect(emitWithAck).toHaveBeenCalledWith("game:acceptReplay", { offerId: "shown-offer" });
  });
});
