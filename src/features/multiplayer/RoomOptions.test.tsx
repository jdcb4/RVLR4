import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { RoomOptions } from "./RoomOptions";
import { buildLobby, buildRoomSync } from "./testRoomSync";

describe("room recovery controls", () => {
  it("requires confirmation and keeps a failed departure recoverable", async () => {
    const user = userEvent.setup();
    const emit = vi.fn(async () => ({ ok: false, error: "Connection lost. Retry." }));
    render(
      <MemoryRouter>
        <RoomOptions sync={buildRoomSync()} connected emitWithAck={emit} />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Room options" }));
    await user.click(screen.getByRole("button", { name: "Leave lobby" }));
    expect(emit).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(emit).toHaveBeenCalledWith("lobby:leave", undefined);
    expect(screen.getByRole("alert")).toHaveTextContent("Connection lost. Retry.");
    expect(screen.getByRole("button", { name: "Confirm" })).toBeEnabled();
  });

  it("offers removal only for away guests and names the seat in confirmation", async () => {
    const user = userEvent.setup();
    const lobby = buildLobby();
    const emit = vi.fn(async () => ({ ok: true }));
    const sync = buildRoomSync({
      you: { playerId: "host", isHost: true },
      lobby: {
        ...lobby,
        players: lobby.players.map((player) =>
          player.isHost ? player : { ...player, disconnectedAt: 123 },
        ),
      },
    });
    render(
      <MemoryRouter>
        <RoomOptions sync={sync} connected emitWithAck={emit} />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Room options" }));
    expect(screen.queryByRole("button", { name: "Remove Host" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Me" }));
    expect(screen.getByRole("dialog", { name: "Remove Me?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(emit).toHaveBeenCalledWith("lobby:hostRemovePlayer", { playerId: "me" });
  });
});
