import type { Server } from "socket.io";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Room, RoomStore } from "./roomStore.ts";

const mocks = vi.hoisted(() => ({
  broadcastRoom: vi.fn(async () => undefined),
  endTurn: vi.fn((match: object) => ({ ...match, stage: "finalSummary" })),
  expireDrawNGuess: vi.fn(() => true),
  expireHat: vi.fn(),
}));

vi.mock("./broadcast.ts", () => ({
  broadcastRoom: mocks.broadcastRoom,
  roomChannel: (code: string) => `room:${code}`,
}));
vi.mock("@/domain/whowhatwhere/game", () => ({
  endTurn: mocks.endTurn,
  isTurnExpired: () => true,
}));
vi.mock("./hatRuntime.ts", () => ({ applyHatExpireTurn: mocks.expireHat }));
vi.mock("./drawnguessRuntime.ts", () => ({
  applyDrawNGuessExpireTurn: mocks.expireDrawNGuess,
}));

import { startDrawNGuessTurnTicker } from "./drawnguessTicker.ts";
import { startHatTurnTicker } from "./hatTicker.ts";
import { startRoomIdleSweeper } from "./roomSweep.ts";
import { startWhoWhatWhereTurnTicker } from "./whoWhatWhereTicker.ts";

const asRoom = (value: object) => value as Room;
const asStore = (rooms: Room[], deleteRoom = vi.fn()) =>
  ({ listRooms: () => rooms, deleteRoom }) as unknown as RoomStore;

describe("authoritative server timers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("expires Who What Where, Hat, and DrawNGuess turns on the shared tick cadence", async () => {
    const wwwRoom = asRoom({
      code: "WWW111",
      gameKind: "whowhatwhere",
      phase: "playing",
      wwwMatch: { stage: "turn", activeTurn: { endsAt: "expired" } },
    });
    const hatRoom = asRoom({
      code: "HAT111",
      gameKind: "hat",
      phase: "playing",
      hatSession: { activeTurn: { endsAt: "2026-08-09T09:59:00.000Z" } },
    });
    const drawingRoom = asRoom({
      code: "DRW111",
      gameKind: "drawnguess",
      phase: "playing",
    });
    const io = {} as Server;

    startWhoWhatWhereTurnTicker(io, asStore([wwwRoom]));
    startHatTurnTicker(io, asStore([hatRoom]));
    startDrawNGuessTurnTicker(io, asStore([drawingRoom]));
    await vi.advanceTimersByTimeAsync(250);

    expect(mocks.endTurn).toHaveBeenCalledOnce();
    expect(mocks.expireHat).toHaveBeenCalledOnce();
    expect(mocks.expireDrawNGuess).toHaveBeenCalledOnce();
    expect(mocks.broadcastRoom).toHaveBeenCalledTimes(3);
  });

  it("sweeps an idle room on the one-minute cleanup timer", async () => {
    const deleteRoom = vi.fn();
    const disconnectSockets = vi.fn(async () => undefined);
    const emit = vi.fn();
    const io = { in: vi.fn(() => ({ disconnectSockets, emit })) } as unknown as Server;
    const room = asRoom({
      code: "OLD111",
      lastActivityAt: Date.now() - 31 * 60_000,
      players: new Map(),
    });

    startRoomIdleSweeper(io, asStore([room], deleteRoom));
    await vi.advanceTimersByTimeAsync(60_000);

    expect(disconnectSockets).toHaveBeenCalledWith(true);
    expect(emit).toHaveBeenCalledWith("room:expired", { code: room.code });
    expect(deleteRoom).toHaveBeenCalledWith("OLD111");
  });
});
