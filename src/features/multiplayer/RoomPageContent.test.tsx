import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import {
  PlayingRoomView,
  RoomPageContent,
  SyncedRoomContent,
} from "@/features/multiplayer/RoomPage";
import { buildRoomSync } from "@/features/multiplayer/testRoomSync";

const invite = {
  canNativeShare: false,
  copiedToast: false,
  joinLink: "https://example.test/name?intent=join&code=ABC123",
  qrToastOpen: false,
  startError: null,
  closeQrToast: vi.fn(),
  copyLink: vi.fn(async () => undefined),
  openQrToast: vi.fn(),
  shareLink: vi.fn(async () => undefined),
  startGame: vi.fn(async () => undefined),
};

const emitWithAck = vi.fn(async () => ({ ok: true }));

function renderWithRouter(children: ReactNode) {
  render(<MemoryRouter>{children}</MemoryRouter>);
}

describe("RoomPageContent", () => {
  it("renders the missing-code state before binding a room", () => {
    renderWithRouter(
      <RoomPageContent
        bindError={null}
        code={undefined}
        connected
        emitWithAck={emitWithAck}
        invite={invite}
        sync={null}
        onBackHome={() => {}}
      />,
    );

    expect(screen.getByText("Missing room code.")).toBeInTheDocument();
  });

  it("renders the ended room state from synced room content", () => {
    renderWithRouter(
      <SyncedRoomContent
        connected
        emitWithAck={emitWithAck}
        invite={invite}
        sync={buildRoomSync({ phase: "ended", lobby: null })}
        onBackHome={() => {}}
      />,
    );

    expect(screen.getByText("Table closed")).toBeInTheDocument();
  });

  it("falls back when a playing sync is missing its game payload", () => {
    renderWithRouter(
      <PlayingRoomView
        emitWithAck={emitWithAck}
        sync={buildRoomSync({ phase: "playing", lobby: null })}
      />,
    );

    expect(screen.getByText("Waiting for host instructions...")).toBeInTheDocument();
  });
});
