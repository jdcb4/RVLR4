import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { RoomLobbyView } from "@/features/multiplayer/RoomLobbyView";
import { buildLobby, buildRoomSync } from "@/features/multiplayer/testRoomSync";
import type { RoomSyncPayload } from "@/multiplayer/roomTypes";

type AckResult = { ok?: boolean; error?: string } | undefined;

const lobby = buildLobby();

function renderLobbyView({
  sync = buildRoomSync(),
  emitWithAck = vi.fn(async () => ({ ok: true })),
  onStartGame = vi.fn(async () => undefined),
}: {
  readonly sync?: RoomSyncPayload;
  readonly emitWithAck?: (event: string, body?: unknown) => Promise<AckResult>;
  readonly onStartGame?: () => Promise<void>;
} = {}) {
  render(
    <MemoryRouter>
      <RoomLobbyView
        canNativeShare={false}
        connected
        copiedToast={false}
        emitWithAck={emitWithAck}
        joinLink="https://example.test/name?intent=join&code=ABC123"
        lobby={sync.lobby ?? lobby}
        qrToastOpen={false}
        startError={null}
        sync={sync}
        onCloseQrToast={() => {}}
        onCopyLink={async () => {}}
        onOpenQrToast={() => {}}
        onShareLink={async () => {}}
        onStartGame={onStartGame}
      />
    </MemoryRouter>,
  );

  return { emitWithAck, onStartGame };
}

describe("RoomLobbyView", () => {
  it("lets a non-host mark themselves ready", async () => {
    const user = userEvent.setup();
    const emitWithAck = vi.fn(async () => ({ ok: true }));

    renderLobbyView({ emitWithAck });

    await user.click(screen.getByRole("button", { name: "Mark ready" }));

    expect(emitWithAck).toHaveBeenCalledWith("lobby:setReady", { ready: true });
  });

  it("wires the host start action through the extracted lobby view", async () => {
    const user = userEvent.setup();
    const onStartGame = vi.fn(async () => undefined);

    renderLobbyView({
      sync: buildRoomSync({
        you: {
          playerId: "host",
          isHost: true,
        },
      }),
      onStartGame,
    });

    await user.click(screen.getByRole("button", { name: "Start game (everyone must ready up)" }));

    expect(onStartGame).toHaveBeenCalledOnce();
  });
});
