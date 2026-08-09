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
  const result = render(
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

  return { emitWithAck, onStartGame, rerender: result.rerender };
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
    const readyLobby = buildLobby({
      startReadiness: { canStart: true, blockers: [] },
    });

    renderLobbyView({
      sync: buildRoomSync({
        lobby: readyLobby,
        you: {
          playerId: "host",
          isHost: true,
        },
      }),
      onStartGame,
    });

    expect(screen.getByText("Everyone is ready.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start game" }));

    expect(onStartGame).toHaveBeenCalledOnce();
  });

  it("explains every blocker and keeps the host start action disabled", () => {
    const blockedLobby = buildLobby({
      startReadiness: {
        canStart: false,
        blockers: [
          { code: "player-count", message: "Imposter needs 4–10 players (currently 2)." },
          { code: "players-not-ready", message: "Waiting for Me to ready up." },
        ],
      },
    });

    renderLobbyView({
      sync: buildRoomSync({
        lobby: blockedLobby,
        you: { playerId: "host", isHost: true },
      }),
    });

    expect(screen.getByText("Imposter needs 4–10 players (currently 2).")).toBeInTheDocument();
    expect(screen.getByText("Waiting for Me to ready up.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start game" })).toBeDisabled();
  });

  it("keeps focused Hat clue typing local while server sync catches up", async () => {
    const user = userEvent.setup();
    const hatLobby = buildLobby({
      teamCount: 2,
      teamNames: ["Red Team", "Blue Team"],
      players: [
        {
          id: "host",
          name: "Host",
          avatarId: "bear",
          isHost: true,
          teamIndex: 0,
          ready: true,
          disconnectedAt: null,
        },
        {
          id: "me",
          name: "Me",
          avatarId: "cat",
          isHost: false,
          teamIndex: 1,
          ready: false,
          disconnectedAt: null,
        },
      ],
      myHatClueDrafts: ["", "", "", "", "", ""],
    });
    const sync = buildRoomSync({
      gameKind: "hat",
      lobby: hatLobby,
      you: {
        playerId: "me",
        isHost: false,
      },
    });
    const { rerender } = renderLobbyView({ sync });
    const firstClue = screen.getAllByPlaceholderText("Enter a famous figure")[0]!;
    expect(firstClue).toHaveAttribute("enterkeyhint", "next");
    expect(firstClue).toHaveAttribute("autocapitalize", "words");

    await user.click(firstClue);
    await user.type(firstClue, "Ada");

    rerender(
      <MemoryRouter>
        <RoomLobbyView
          canNativeShare={false}
          connected
          copiedToast={false}
          emitWithAck={vi.fn(async () => ({ ok: true }))}
          joinLink="https://example.test/name?intent=join&code=ABC123"
          lobby={hatLobby}
          qrToastOpen={false}
          startError={null}
          sync={sync}
          onCloseQrToast={() => {}}
          onCopyLink={async () => {}}
          onOpenQrToast={() => {}}
          onShareLink={async () => {}}
          onStartGame={async () => {}}
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByPlaceholderText("Enter a famous figure")[0]!).toHaveValue("Ada");
  });

  it("advances between Hat clue fields when Enter is pressed", async () => {
    const user = userEvent.setup();
    const hatLobby = buildLobby({
      teamCount: 2,
      teamNames: ["Red Team", "Blue Team"],
      myHatClueDrafts: ["", "", "", "", "", ""],
    });
    const sync = buildRoomSync({
      gameKind: "hat",
      lobby: hatLobby,
      you: { playerId: "me", isHost: false },
    });
    renderLobbyView({ sync });
    const clues = screen.getAllByPlaceholderText("Enter a famous figure");

    await user.click(clues[0]!);
    await user.keyboard("{Enter}");

    expect(clues[1]).toHaveFocus();
    expect(clues.at(-1)).toHaveAttribute("enterkeyhint", "done");
  });
});
