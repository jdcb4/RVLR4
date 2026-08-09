// @vitest-environment node

import http from "node:http";
import type { AddressInfo } from "node:net";

import express from "express";
import { Server } from "socket.io";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { RoomSyncPayload } from "@/multiplayer/roomTypes";

import { handleJsonBodyError, registerHttpRoutes } from "./httpRoutes.ts";
import { RoomStore } from "./roomStore.ts";
import { registerSocketHandlers } from "./socketHandlers.ts";

type TestHarness = {
  readonly url: string;
  readonly close: () => Promise<void>;
  readonly dropPlayerTransport: (playerId: string) => Promise<void>;
};

async function bootHarness(): Promise<TestHarness> {
  const app = express();
  app.use(express.json({ limit: "16kb" }));
  app.use(handleJsonBodyError);

  const store = new RoomStore();
  registerHttpRoutes(app, store);

  const server = http.createServer(app);
  const io = new Server(server);
  registerSocketHandlers(io, store);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;

  return {
    url,
    dropPlayerTransport: async (playerId) => {
      const sockets = await io.fetchSockets();
      const playerSocket = sockets.find((socket) => socket.data.playerId === playerId);

      if (!playerSocket) {
        throw new Error(`No bound socket for ${playerId}`);
      }

      playerSocket.conn.close();
    },
    close: () =>
      new Promise<void>((resolve) => {
        io.close(() => {
          server.close(() => resolve());
        });
      }),
  };
}

function bindReconnectingClient(url: string, creds: Credentials): Promise<BoundClient> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(url, {
      autoConnect: false,
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 10,
      forceNew: true,
    });

    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        socket.disconnect();
        reject(new Error(`Timed out binding reconnecting socket for ${creds.playerId}`));
      }
    }, 4000);

    socket.on("connect", () => {
      socket.emit(
        "session:bind",
        { code: creds.code, playerId: creds.playerId, secret: creds.secret },
        (ack?: { ok?: boolean; error?: string }) => {
          if (ack?.ok === false && !resolved) {
            clearTimeout(timer);
            reject(new Error(ack.error ?? "session:bind rejected"));
          }
        },
      );
    });
    socket.once("room:sync", (payload: RoomSyncPayload) => {
      resolved = true;
      clearTimeout(timer);
      resolve({ socket, firstSync: payload });
    });
    socket.on("connect_error", (error) => {
      if (!resolved) {
        clearTimeout(timer);
        reject(error);
      }
    });
    socket.connect();
  });
}

type Credentials = {
  readonly code: string;
  readonly playerId: string;
  readonly secret: string;
};

type BoundClient = {
  readonly socket: ClientSocket;
  readonly firstSync: RoomSyncPayload;
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`POST ${url} -> ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
}

function bindClient(url: string, creds: Credentials): Promise<BoundClient> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(url, {
      autoConnect: false,
      transports: ["websocket"],
      reconnection: false,
      forceNew: true,
    });

    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        socket.disconnect();
        reject(new Error(`Timed out binding socket for ${creds.playerId}`));
      }
    }, 4000);

    socket.once("room:sync", (payload: RoomSyncPayload) => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearTimeout(timer);
      resolve({ socket, firstSync: payload });
    });

    socket.on("connect_error", (err) => {
      if (!resolved) {
        clearTimeout(timer);
        reject(err);
      }
    });

    socket.connect();
    socket.emit(
      "session:bind",
      {
        code: creds.code,
        playerId: creds.playerId,
        secret: creds.secret,
      },
      (ack?: { ok?: boolean; error?: string }) => {
        if (ack && ack.ok === false) {
          if (!resolved) {
            clearTimeout(timer);
            reject(new Error(ack.error ?? "session:bind rejected"));
          }
        }
      },
    );
  });
}

async function createRoomWithGuests(
  url: string,
  gameKind: "whowhatwhere" | "hat",
): Promise<{ host: Credentials; guests: Credentials[] }> {
  const host = await postJson<Credentials>(`${url}/api/rooms`, {
    gameKind,
    hostName: "Host",
  });

  const guests: Credentials[] = [];
  for (const name of ["G1", "G2", "G3"]) {
    guests.push(await postJson<Credentials>(`${url}/api/rooms/${host.code}/join`, { name }));
  }

  return { host, guests };
}

async function bindAllClients(url: string, creds: readonly Credentials[]): Promise<BoundClient[]> {
  const bounds: BoundClient[] = [];

  for (const entry of creds) {
    bounds.push(await bindClient(url, entry));
  }

  return bounds;
}

function nextSync(socket: ClientSocket, timeoutMs = 4000): Promise<RoomSyncPayload> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("room:sync", listener);
      reject(new Error("Timed out waiting for room:sync"));
    }, timeoutMs);

    const listener = (payload: RoomSyncPayload) => {
      clearTimeout(timer);
      socket.off("room:sync", listener);
      resolve(payload);
    };

    socket.on("room:sync", listener);
  });
}

async function nextSyncWhere(
  socket: ClientSocket,
  predicate: (payload: RoomSyncPayload) => boolean,
  timeoutMs = 4000,
): Promise<RoomSyncPayload> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const payload = await nextSync(socket, Math.max(1, deadline - Date.now()));

    if (predicate(payload)) {
      return payload;
    }
  }

  throw new Error("Timed out waiting for matching room:sync");
}

function emitAck<TAck = { ok?: boolean; error?: string }>(
  socket: ClientSocket,
  event: string,
  payload: unknown,
): Promise<TAck> {
  return new Promise((resolve) => {
    const handleAck = (ack: TAck) => resolve(ack);

    if (payload === undefined) {
      socket.emit(event, handleAck);
    } else {
      socket.emit(event, payload, handleAck);
    }
  });
}

describe("multiplayer smoke", () => {
  let harness: TestHarness;

  beforeEach(async () => {
    harness = await bootHarness();
  });

  afterEach(async () => {
    await harness.close();
  });

  it("hosts a Who What Where lobby, lets a guest join, marks ready, and starts the match", async () => {
    const { host, guests } = await createRoomWithGuests(harness.url, "whowhatwhere");
    const bounds = await bindAllClients(harness.url, [host, ...guests]);
    const hostBound = bounds[0]!;
    const guestBounds = bounds.slice(1);

    try {
      expect(hostBound.firstSync.code).toBe(host.code);
      expect(hostBound.firstSync.phase).toBe("lobby");
      expect(hostBound.firstSync.you.isHost).toBe(true);
      for (const bound of guestBounds) {
        expect(bound.firstSync.you.isHost).toBe(false);
      }

      // Each guest marks ready; the host is not required to ready themselves.
      for (const bound of guestBounds) {
        const ack = await emitAck(bound.socket, "lobby:setReady", {
          ready: true,
        });
        expect(ack).toEqual({ ok: true });
      }

      // Host starts the match; everyone receives a sync with phase=playing.
      const playingPromises = [hostBound, ...guestBounds].map((bound) => nextSync(bound.socket));
      const startAck = await emitAck(hostBound.socket, "lobby:startGame", undefined);
      expect(startAck).toEqual({ ok: true });

      const playingSyncs = await Promise.all(playingPromises);
      for (const sync of playingSyncs) {
        expect(sync.phase).toBe("playing");
        expect(sync.www).not.toBeNull();
      }
    } finally {
      hostBound.socket.disconnect();
      for (const bound of guestBounds) {
        bound.socket.disconnect();
      }
    }
  }, 10_000);

  it("rejects malformed socket payloads with the schema error", async () => {
    const host = await postJson<Credentials>(`${harness.url}/api/rooms`, {
      gameKind: "hat",
      hostName: "Host",
    });

    const bound = await bindClient(harness.url, host);

    try {
      // ready should be a boolean; sending a string should be rejected by Zod
      // before any state mutation. The wrapper translates ZodError -> "Invalid request."
      const ack = await emitAck(bound.socket, "lobby:setReady", {
        ready: "yes-please",
      });

      expect(ack.ok).toBe(false);
      expect(ack.error).toBe("Invalid request.");
    } finally {
      bound.socket.disconnect();
    }
  });

  it("returns stable 413 and 429 HTTP envelopes", async () => {
    const oversized = await fetch(`${harness.url}/api/rooms`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameKind: "hat", hostName: "x".repeat(17_000) }),
    });
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toMatchObject({ code: "PAYLOAD_TOO_LARGE" });

    for (let index = 0; index < 6; index += 1) {
      await postJson(`${harness.url}/api/rooms`, { gameKind: "hat", hostName: `Host ${index}` });
    }

    const limited = await fetch(`${harness.url}/api/rooms`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameKind: "hat", hostName: "Overflow" }),
    });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
    expect(await limited.json()).toMatchObject({ code: "RATE_LIMITED" });
  });

  it("uses the synchronized lobby readiness reason when rejecting start", async () => {
    const host = await postJson<Credentials>(`${harness.url}/api/rooms`, {
      gameKind: "imposter",
      hostName: "Host",
    });
    const bound = await bindClient(harness.url, host);

    try {
      const blocker = bound.firstSync.lobby?.startReadiness.blockers[0];
      expect(blocker).toEqual({
        code: "player-count",
        message: "Imposter needs 4–10 players (currently 1).",
      });

      const ack = await emitAck(bound.socket, "lobby:startGame", undefined);
      expect(ack).toEqual({ ok: false, error: blocker?.message });
    } finally {
      bound.socket.disconnect();
    }
  });

  it("re-binds a session after reconnect before accepting another room command", async () => {
    const host = await postJson<Credentials>(`${harness.url}/api/rooms`, {
      gameKind: "imposter",
      hostName: "Host",
    });
    const guest = await postJson<Credentials>(`${harness.url}/api/rooms/${host.code}/join`, {
      name: "Guest",
    });
    const bound = await bindReconnectingClient(harness.url, guest);

    try {
      const reconnected = new Promise<void>((resolve) =>
        bound.socket.once("connect", () => resolve()),
      );
      const reboundSync = nextSyncWhere(
        bound.socket,
        (sync) => sync.you.playerId === guest.playerId && sync.phase === "lobby",
      );

      await harness.dropPlayerTransport(guest.playerId);
      await reconnected;
      await reboundSync;

      const readySync = nextSyncWhere(
        bound.socket,
        (sync) =>
          sync.lobby?.players.find((player) => player.id === guest.playerId)?.ready === true,
      );
      expect(await emitAck(bound.socket, "lobby:setReady", { ready: true })).toEqual({ ok: true });
      expect((await readySync).you.playerId).toBe(guest.playerId);
    } finally {
      bound.socket.disconnect();
    }
  });

  it("starts a Hat lobby after the host swaps teams and everyone is ready", async () => {
    const { host, guests } = await createRoomWithGuests(harness.url, "hat");
    const bounds = await bindAllClients(harness.url, [host, ...guests]);
    const hostBound = bounds[0]!;
    const guestOneBound = bounds[1]!;
    const guestBounds = bounds.slice(2);

    try {
      expect(
        await emitAck(hostBound.socket, "lobby:hostMovePlayer", {
          playerId: host.playerId,
          teamIndex: 1,
        }),
      ).toEqual({ ok: true });
      expect(
        await emitAck(hostBound.socket, "lobby:hostMovePlayer", {
          playerId: guests[0]!.playerId,
          teamIndex: 0,
        }),
      ).toEqual({ ok: true });

      for (const [playerIndex, bound] of bounds.entries()) {
        for (let clueIndex = 0; clueIndex < 6; clueIndex += 1) {
          const ack = await emitAck(bound.socket, "lobby:hatSetClueCell", {
            clueIndex,
            value: `P${playerIndex + 1} clue ${clueIndex + 1}`,
          });
          expect(ack).toEqual({ ok: true });
        }
      }

      for (const bound of [guestOneBound, ...guestBounds]) {
        const ack = await emitAck(bound.socket, "lobby:setReady", { ready: true });
        expect(ack).toEqual({ ok: true });
      }

      const playingPromise = nextSyncWhere(hostBound.socket, (sync) => sync.phase === "playing");
      const startAck = await emitAck(hostBound.socket, "lobby:startGame", undefined);
      expect(startAck).toEqual({ ok: true });

      const playingSync = await playingPromise;
      expect(playingSync.hat?.session.teams).toHaveLength(2);
      expect(playingSync.hat?.session.players).toHaveLength(4);
    } finally {
      for (const bound of bounds) {
        bound.socket.disconnect();
      }
    }
  }, 10_000);
});
