import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { createDefaultSettings } from "@/domain/whowhatwhere/setup";
import { RoomLobbyView } from "@/features/multiplayer/RoomLobbyView";
import type { LobbyDto, RoomSyncPayload } from "@/multiplayer/roomTypes";

type AckResult = { ok?: boolean; error?: string } | undefined;

const lobby: LobbyDto = {
  teamCount: 0,
  teamNames: [],
  wwwSettings: createDefaultSettings(),
  hatTurnDurationSeconds: 60,
  hatSkipsPerTurn: 3,
  imposterPlayerCount: 2,
  imposterImposterCount: 1,
  players: [
    {
      id: "host",
      name: "Host",
      isHost: true,
      teamIndex: null,
      ready: true,
      disconnectedAt: null,
    },
    {
      id: "me",
      name: "Me",
      isHost: false,
      teamIndex: null,
      ready: false,
      disconnectedAt: null,
    },
  ],
  hatClueDrafts: {},
};

function buildSync(overrides: Partial<RoomSyncPayload> = {}): RoomSyncPayload {
  return {
    code: "ABC123",
    gameKind: "imposter",
    phase: "lobby",
    you: {
      playerId: "me",
      isHost: false,
    },
    lobby,
    www: null,
    hat: null,
    imposter: null,
    replay: {
      offerActive: false,
      acceptedIds: [],
      cancelledByDisconnect: false,
    },
    ...overrides,
  };
}

function renderLobbyView({
  sync = buildSync(),
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
      sync: buildSync({
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
