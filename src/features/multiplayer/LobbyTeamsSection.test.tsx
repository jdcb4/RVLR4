import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { LobbyDto } from "@/domain/multiplayer/protocol";
import { LobbyTeamsSection } from "@/features/multiplayer/LobbyTeamsSection";
import { buildLobby } from "@/features/multiplayer/testRoomSync";

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

  it("uses the dense two-column roster once six players join", async () => {
    const user = userEvent.setup();
    const emitWithAck = vi.fn(async () => ({ ok: true }));
    const longName = "Alexandria With A Long Name";
    const players: LobbyDto["players"] = Array.from({ length: 6 }, (_, index) => ({
      id: index === 0 ? "host" : `player-${index}`,
      name: index === 5 ? longName : `Player ${index + 1}`,
      avatarId: index % 2 === 0 ? "cat" : "dog",
      isHost: index === 0,
      teamIndex: index % 2,
      ready: index < 4,
      disconnectedAt: null,
    }));
    const { container } = render(
      <LobbyTeamsSection
        emitWithAck={emitWithAck}
        isHost
        lobby={buildTeamLobby({ players })}
        myPlayerId="host"
      />,
    );

    expect(container.querySelector('[data-dense="true"]')).toBeInTheDocument();
    expect(container.querySelectorAll("ul.grid-cols-2")).toHaveLength(2);
    expect(screen.getByTitle(longName)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: `Choose team for ${longName}` }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
