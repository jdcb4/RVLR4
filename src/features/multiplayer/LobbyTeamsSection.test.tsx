import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LobbyTeamsSection } from "@/features/multiplayer/LobbyTeamsSection";
import { buildLobby } from "@/features/multiplayer/testRoomSync";
import type { LobbyDto } from "@/multiplayer/roomTypes";

function buildTeamLobby(overrides: Partial<LobbyDto> = {}) {
  return buildLobby({
    teamCount: 2,
    teamNames: ["Red", "Blue"],
    players: [
      {
        id: "aaa-captain",
        name: "Captain",
        avatarId: "bear",
        isHost: false,
        teamIndex: 0,
        ready: true,
        disconnectedAt: null,
      },
      {
        id: "host",
        name: "Host",
        avatarId: "cat",
        isHost: true,
        teamIndex: 0,
        ready: true,
        disconnectedAt: null,
      },
      {
        id: "me",
        name: "Me",
        avatarId: "dog",
        isHost: false,
        teamIndex: 1,
        ready: false,
        disconnectedAt: null,
      },
    ],
    ...overrides,
  });
}

describe("LobbyTeamsSection", () => {
  it("lets a team captain rename their team", async () => {
    const user = userEvent.setup();
    const emitWithAck = vi.fn(async () => ({ ok: true }));

    render(
      <LobbyTeamsSection
        emitWithAck={emitWithAck}
        isHost={false}
        lobby={buildTeamLobby()}
        myPlayerId="aaa-captain"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Rename Red" }));
    await user.clear(screen.getByDisplayValue("Red"));
    const nameInput = screen.getByRole("textbox");
    expect(nameInput).toHaveAttribute("enterkeyhint", "done");
    expect(nameInput).toHaveAttribute("autocapitalize", "words");
    await user.type(nameInput, "Scarlet{Enter}");

    expect(emitWithAck).toHaveBeenCalledWith("lobby:captainSetTeamName", {
      teamIndex: 0,
      name: "Scarlet",
    });
  });

  it("lets the host move a player through the team picker dialog", async () => {
    const user = userEvent.setup();
    const emitWithAck = vi.fn(async () => ({ ok: true }));

    render(
      <LobbyTeamsSection
        emitWithAck={emitWithAck}
        isHost
        lobby={buildTeamLobby()}
        myPlayerId="host"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Choose team for Me" }));
    await user.selectOptions(screen.getByLabelText("Team"), "0");
    await user.click(screen.getByRole("button", { name: "Move" }));

    expect(emitWithAck).toHaveBeenCalledWith("lobby:hostMovePlayer", {
      playerId: "me",
      teamIndex: 0,
    });
  });
});
