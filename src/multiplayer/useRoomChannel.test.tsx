import { act, renderHook, waitFor } from "@testing-library/react";
import { io, type Socket } from "socket.io-client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { persistSession, useRoomChannel } from "@/multiplayer/useRoomChannel";

vi.mock("socket.io-client", () => ({ io: vi.fn() }));

type Listener = (...args: unknown[]) => void;

class FakeSocket {
  connected = false;
  bindAck: { ok?: boolean; error?: string } = { ok: true };
  connectCalls = 0;
  readonly emissions: Array<{ event: string; payload: unknown }> = [];
  private readonly listeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener) {
    const listeners = this.listeners.get(event) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(event, listeners);
    return this;
  }

  off(event: string, listener: Listener) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  connect() {
    this.connectCalls += 1;
    this.connected = true;
    this.trigger("connect");
    return this;
  }

  disconnect() {
    const wasConnected = this.connected;
    this.connected = false;
    if (wasConnected) {
      this.trigger("disconnect");
    }
    return this;
  }

  emit(event: string, payload: unknown, ack?: (value: { ok?: boolean; error?: string }) => void) {
    this.emissions.push({ event, payload });
    if (event === "session:bind") {
      ack?.(this.bindAck);
    }
    return this;
  }

  reconnect() {
    this.connected = true;
    this.trigger("connect");
  }

  trigger(event: string, ...args: unknown[]) {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(...args);
    }
  }
}

describe("useRoomChannel", () => {
  let socket: FakeSocket;

  beforeEach(() => {
    sessionStorage.clear();
    socket = new FakeSocket();
    vi.mocked(io).mockReturnValue(socket as unknown as Socket);
  });

  it("binds the session again after an automatic reconnect", async () => {
    persistSession({ code: "ABC123", playerId: "player-1", secret: "secret-1" });

    const { result } = renderHook(() => useRoomChannel("ABC123", true));

    await waitFor(() => expect(result.current.connected).toBe(true));
    expect(socket.emissions.filter(({ event }) => event === "session:bind")).toHaveLength(1);

    act(() => {
      socket.disconnect();
      socket.reconnect();
    });

    await waitFor(() => expect(result.current.connected).toBe(true));
    expect(socket.emissions.filter(({ event }) => event === "session:bind")).toHaveLength(2);
  });

  it("disconnects and removes listeners on unmount", () => {
    persistSession({ code: "ABC123", playerId: "player-1", secret: "secret-1" });
    const { unmount } = renderHook(() => useRoomChannel("ABC123", true));
    expect(socket.connected).toBe(true);
    unmount();
    expect(socket.connected).toBe(false);
    socket.reconnect();
    expect(socket.emissions.filter(({ event }) => event === "session:bind")).toHaveLength(1);
  });

  it("clears old sync on room changes and ignores messages for another session", () => {
    persistSession({ code: "ABC123", playerId: "player-1", secret: "secret-1" });
    persistSession({ code: "DEF456", playerId: "player-2", secret: "secret-2" });
    const { result, rerender } = renderHook(({ code, enabled }) => useRoomChannel(code, enabled), {
      initialProps: { code: "ABC123", enabled: true },
    });
    act(() => socket.trigger("room:sync", { code: "ABC123", you: { playerId: "player-1" } }));
    expect(result.current.sync?.code).toBe("ABC123");
    rerender({ code: "DEF456", enabled: true });
    expect(result.current.sync).toBeNull();
    act(() => socket.trigger("room:sync", { code: "ABC123", you: { playerId: "player-1" } }));
    expect(result.current.sync).toBeNull();
    act(() => socket.trigger("room:sync", { code: "DEF456", you: { playerId: "player-2" } }));
    expect(result.current.sync?.code).toBe("DEF456");
    rerender({ code: "DEF456", enabled: false });
    expect(socket.connected).toBe(false);
    expect(result.current.connected).toBe(false);
    expect(result.current.sync).toBeNull();
  });

  it("does not connect without stored session credentials", async () => {
    const { result } = renderHook(() => useRoomChannel("ABC123", true));

    await waitFor(() =>
      expect(result.current.bindError).toBe("Missing session. Go back and enter your name again."),
    );
    expect(socket.connectCalls).toBe(0);
    expect(socket.connected).toBe(false);
    expect(socket.emissions).toHaveLength(0);
  });

  it("keeps commands unavailable when session binding is rejected", async () => {
    socket.bindAck = { ok: false, error: "Session expired." };
    persistSession({ code: "ABC123", playerId: "player-1", secret: "secret-1" });

    const { result } = renderHook(() => useRoomChannel("ABC123", true));

    await waitFor(() => expect(result.current.bindError).toBe("Session expired."));
    expect(result.current.connected).toBe(false);
    await expect(result.current.emitWithAck("lobby:setReady", { ready: true })).resolves.toEqual({
      ok: false,
      error: "Reconnecting to the room.",
    });
  });
});
