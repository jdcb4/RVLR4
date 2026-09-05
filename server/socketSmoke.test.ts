// @vitest-environment node

import http from "node:http";
import type { AddressInfo } from "node:net";

import express from "express";
import { Server } from "socket.io";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { RoomSyncPayload } from "@/multiplayer/roomTypes";
import { requestSocketAck } from "@/services/networkRequests";

import { startHatMatch } from "./hatRuntime.ts";
import { handleJsonBodyError, registerHttpRoutes } from "./httpRoutes.ts";
import { createCorsOriginValidator } from "./originPolicy.ts";
import { RoomStore } from "./roomStore.ts";
import { registerSocketHandlers } from "./socketHandlers.ts";
import { startWhoWhatWhereMatch } from "./whoWhatWhereRuntime.ts";

type TestHarness = {
  readonly store: RoomStore;
  readonly io: Server;
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
  const io = new Server(server, {
    cors: { origin: createCorsOriginValidator(["http://allowed.test"]) },
    maxHttpBufferSize: 256 * 1_024,
  });
  registerSocketHandlers(io, store);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;

  return {
    store,
    io,
    url,
    dropPlayerTransport: async (playerId) => {
      const sockets = [...io.sockets.sockets.values()];
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

  it("removes only away lobby seats and recovers capacity without reusing identity", async () => {
    const { host, guests } = await createRoomWithGuests(harness.url, "hat");
    const [owner, present] = await bindAllClients(harness.url, [host, guests[0]!]);
    const room = harness.store.getRoom(host.code)!;
    const abandoned = guests[1]!;
    const oldName = room.players.get(abandoned.playerId)!.name;
    try {
      expect(room.players.get(abandoned.playerId)?.disconnectedAt).toEqual(expect.any(Number));
      expect(
        (await emitAck(present!.socket, "lobby:hostRemovePlayer", { playerId: abandoned.playerId }))
          .ok,
      ).toBe(false);
      expect(
        (await emitAck(owner!.socket, "lobby:hostRemovePlayer", { playerId: guests[0]!.playerId }))
          .ok,
      ).toBe(false);
      expect(
        (await emitAck(owner!.socket, "lobby:hostRemovePlayer", { playerId: host.playerId })).ok,
      ).toBe(false);
      for (let index = room.players.size; index < 12; index += 1)
        harness.store.joinRoom({ code: room.code, name: `Extra ${index}` });
      await expect(
        postJson(`${harness.url}/api/rooms/${room.code}/join`, { name: oldName }),
      ).rejects.toThrow();
      expect(
        await emitAck(owner!.socket, "lobby:hostRemovePlayer", { playerId: abandoned.playerId }),
      ).toEqual({ ok: true });
      expect(room.hatClueDrafts?.[abandoned.playerId]).toBeUndefined();
      expect(harness.store.authenticate(abandoned)).toBeNull();
      const replacement = await postJson<Credentials>(
        `${harness.url}/api/rooms/${room.code}/join`,
        { name: oldName },
      );
      expect(replacement.playerId).not.toBe(abandoned.playerId);
      expect(room.players.size).toBe(12);
      expect(room.players.get(guests[0]!.playerId)?.disconnectedAt).toBeNull();
    } finally {
      owner!.socket.disconnect();
      present!.socket.disconnect();
    }
  });

  it("explicit guest departure invalidates every tab of that seat and preserves peers", async () => {
    const { host, guests } = await createRoomWithGuests(harness.url, "hat");
    const bounds = await bindAllClients(harness.url, [host, guests[0]!, guests[0]!]);
    const room = harness.store.getRoom(host.code)!;
    try {
      const ended = new Promise((resolve) => bounds[2]!.socket.once("session:ended", resolve));
      expect(await emitAck(bounds[1]!.socket, "lobby:leave", undefined)).toEqual({ ok: true });
      expect(await ended).toEqual({ code: room.code });
      expect(room.players.has(guests[0]!.playerId)).toBe(false);
      expect(harness.store.authenticate(guests[0]!)).toBeNull();
      expect((await emitAck(bounds[2]!.socket, "lobby:setReady", { ready: true })).ok).toBe(false);
      expect(room.players.get(host.playerId)?.disconnectedAt).toBeNull();
      expect((await emitAck(bounds[0]!.socket, "lobby:leave", undefined)).ok).toBe(false);
    } finally {
      bounds.forEach(({ socket }) => socket.disconnect());
    }
  });

  it("lets only the host end an active match and later close the lobby", async () => {
    const { host, guests } = await createRoomWithGuests(harness.url, "hat");
    const bounds = await bindAllClients(harness.url, [host, ...guests]);
    const room = harness.store.getRoom(host.code)!;
    try {
      for (const player of room.players.values()) {
        room.hatClueDrafts![player.id] = Array.from(
          { length: 6 },
          (_, index) => `${player.name} ${index}`,
        );
        player.ready = true;
      }
      const clues = structuredClone(room.hatClueDrafts);
      startHatMatch(room);
      expect(
        (
          await emitAck(bounds[0]!.socket, "lobby:hostRemovePlayer", {
            playerId: guests[0]!.playerId,
          })
        ).ok,
      ).toBe(false);
      expect((await emitAck(bounds[1]!.socket, "lobby:leave", undefined)).ok).toBe(false);
      expect((await emitAck(bounds[1]!.socket, "room:hostReturnToLobby", undefined)).ok).toBe(
        false,
      );
      expect(await emitAck(bounds[0]!.socket, "room:hostReturnToLobby", undefined)).toEqual({
        ok: true,
      });
      expect(room.phase).toBe("lobby");
      expect(room.hatSession).toBeUndefined();
      expect(room.hatClueDrafts).toEqual(clues);
      expect([...room.players.values()].every((player) => !player.ready)).toBe(true);
      expect((await emitAck(bounds[1]!.socket, "lobby:hostClose", undefined)).ok).toBe(false);
      room.starting = true;
      expect((await emitAck(bounds[0]!.socket, "lobby:hostClose", undefined)).ok).toBe(false);
      expect(room.phase).toBe("lobby");
      delete room.starting;
      expect(await emitAck(bounds[0]!.socket, "lobby:hostClose", undefined)).toEqual({ ok: true });
      expect(room.phase).toBe("ended");
    } finally {
      bounds.forEach(({ socket }) => socket.disconnect());
    }
  });

  it("replaces a cancelled replay after all players return and rejects stale acceptances", async () => {
    const { host, guests } = await createRoomWithGuests(harness.url, "whowhatwhere");
    const bounds = await bindAllClients(harness.url, [host, ...guests]);
    const room = harness.store.getRoom(host.code)!;
    const restored: BoundClient[] = [];
    try {
      await startWhoWhatWhereMatch(room);
      room.wwwMatch = { ...room.wwwMatch!, stage: "results" };
      expect(await emitAck(bounds[0]!.socket, "game:hostOfferReplay", undefined)).toEqual({
        ok: true,
      });
      const oldOfferId = room.replayOfferId!;
      expect(
        await emitAck(bounds[1]!.socket, "game:acceptReplay", { offerId: oldOfferId }),
      ).toEqual({ ok: true });
      await emitAck(bounds[0]!.socket, "game:hostOfferReplay", undefined);
      expect(room.replayAcceptedPlayerIds).toContain(guests[0]!.playerId);
      expect(room.replayOfferId).toBe(oldOfferId);
      bounds[2]!.socket.disconnect();
      bounds[3]!.socket.disconnect();
      await expect
        .poll(() =>
          guests
            .slice(1)
            .every((guest) => room.players.get(guest.playerId)?.disconnectedAt != null),
        )
        .toBe(true);
      restored.push(await bindClient(harness.url, guests[1]!));
      expect(room.replayCancelledByDisconnect).toBe(true);
      expect((await emitAck(bounds[0]!.socket, "game:hostOfferReplay", undefined)).ok).toBe(false);
      restored.push(await bindClient(harness.url, guests[2]!));
      expect(room.replayCancelledByDisconnect).toBeUndefined();
      expect(await emitAck(bounds[0]!.socket, "game:hostOfferReplay", undefined)).toEqual({
        ok: true,
      });
      expect(room.replayOfferId).not.toBe(oldOfferId);
      expect(
        (await emitAck(bounds[1]!.socket, "game:acceptReplay", { offerId: oldOfferId })).ok,
      ).toBe(false);
      expect(room.replayAcceptedPlayerIds).toEqual([host.playerId]);
      for (const bound of [bounds[1]!, ...restored]) {
        expect(
          await emitAck(bound.socket, "game:acceptReplay", { offerId: room.replayOfferId }),
        ).toEqual({ ok: true });
      }
      expect(room.phase).toBe("lobby");
      expect(room.players.size).toBe(4);
      expect(room.replayOfferId).toBeUndefined();
    } finally {
      for (const bound of [...bounds, ...restored]) bound.socket.disconnect();
    }
  });

  it("settles unacknowledged and disconnected requests without replaying offline commands", async () => {
    const { host } = await createRoomWithGuests(harness.url, "hat");
    const { socket } = await bindClient(harness.url, host);
    try {
      expect(await requestSocketAck(socket, "ignored:event", undefined, 30)).toMatchObject({
        ok: false,
        code: "REQUEST_TIMEOUT",
      });
      const pending = requestSocketAck(socket, "ignored:event", undefined, 4_000);
      socket.disconnect();
      expect(await pending).toMatchObject({ ok: false, code: "DISCONNECTED" });
      expect(await requestSocketAck(socket, "lobby:setReady", { ready: true })).toMatchObject({
        ok: false,
        code: "DISCONNECTED",
      });
      expect(harness.store.getRoom(host.code)?.players.get(host.playerId)?.ready).toBe(false);
    } finally {
      socket.disconnect();
    }
  });

  it("keeps a player present until their last tab disconnects", async () => {
    const { host, guests } = await createRoomWithGuests(harness.url, "hat");
    const [first, duplicate, peer] = await bindAllClients(harness.url, [host, host, guests[0]!]);
    try {
      const firstUpdate = nextSync(peer!.socket);
      duplicate!.socket.disconnect();
      const stillPresent = await firstUpdate;
      await expect
        .poll(() => harness.io.sockets.adapter.rooms.get(`room:${host.code}`)?.size)
        .toBe(2);
      expect(
        harness.store.getRoom(host.code)?.players.get(host.playerId)?.disconnectedAt,
      ).toBeNull();
      expect(
        stillPresent.lobby?.players.find((player) => player.id === host.playerId)?.disconnectedAt,
      ).toBeNull();
      expect(await emitAck(first!.socket, "lobby:setReady", { ready: true })).toEqual({ ok: true });
      const finalUpdate = nextSyncWhere(
        peer!.socket,
        (sync) =>
          typeof sync.lobby?.players.find((player) => player.id === host.playerId)
            ?.disconnectedAt === "number",
      );
      first!.socket.disconnect();
      const away = await finalUpdate;
      expect(
        away.lobby?.players.find((player) => player.id === host.playerId)?.disconnectedAt,
      ).toEqual(expect.any(Number));
    } finally {
      first!.socket.disconnect();
      duplicate!.socket.disconnect();
      peer!.socket.disconnect();
    }
  });

  it("rebinds into one room and leaves the previous room able to broadcast", async () => {
    const { host, guests } = await createRoomWithGuests(harness.url, "hat");
    const [bound, peer] = await bindAllClients(harness.url, [host, guests[0]!]);
    const other = await postJson<Credentials>(`${harness.url}/api/rooms`, {
      gameKind: "hat",
      hostName: "Other",
    });
    try {
      const departure = nextSync(peer!.socket);
      expect(
        await emitAck(bound!.socket, "session:bind", {
          code: other.code,
          playerId: other.playerId,
          secret: other.secret,
        }),
      ).toEqual({ ok: true });
      expect(
        (await departure).lobby?.players.find((player) => player.id === host.playerId)
          ?.disconnectedAt,
      ).toEqual(expect.any(Number));
      expect(harness.io.sockets.adapter.rooms.get(`room:${host.code}`)?.size).toBe(1);
      expect(harness.io.sockets.adapter.rooms.get(`room:${other.code}`)?.size).toBe(1);
      expect(await emitAck(peer!.socket, "lobby:setReady", { ready: true })).toEqual({ ok: true });
      expect(await emitAck(bound!.socket, "lobby:setReady", { ready: true })).toEqual({ ok: true });
    } finally {
      bound!.socket.disconnect();
      peer!.socket.disconnect();
    }
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

  it("survives malformed acknowledgement positions and keeps another room usable", async () => {
    const { host, guests } = await createRoomWithGuests(harness.url, "hat");
    const [attacker, peer] = await bindAllClients(harness.url, [host, guests[0]!]);
    const other = await postJson<Credentials>(`${harness.url}/api/rooms`, {
      gameKind: "hat",
      hostName: "Other host",
    });
    const otherBound = await bindClient(harness.url, other);
    try {
      for (const event of ["session:bind", "lobby:setReady"]) {
        const payload = event === "session:bind" ? host : { ready: true };
        attacker!.socket.emit(event, payload, 42);
        attacker!.socket.emit(event, payload, null);
        const ack = await new Promise((resolve) =>
          attacker!.socket.emit(event, payload, 42, resolve),
        );
        expect(ack).toMatchObject({ ok: false, code: "INVALID_REQUEST" });
      }
      expect(await emitAck(peer!.socket, "lobby:setReady", { ready: true })).toEqual({ ok: true });
      expect(await emitAck(otherBound.socket, "lobby:setReady", { ready: true })).toEqual({
        ok: true,
      });
      expect((await fetch(`${harness.url}/api/rooms/${other.code}`)).ok).toBe(true);
    } finally {
      attacker!.socket.disconnect();
      peer!.socket.disconnect();
      otherBound.socket.disconnect();
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

  it("rejects an unlisted Socket.IO browser origin", async () => {
    const socket = ioClient(harness.url, {
      transports: ["websocket"],
      forceNew: true,
      extraHeaders: { Origin: "https://evil.example.com" },
    });

    try {
      const error = await new Promise<Error>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Timed out waiting for origin rejection")),
          2_000,
        );
        socket.once("connect", () => {
          clearTimeout(timer);
          reject(new Error("Socket unexpectedly connected"));
        });
        socket.once("connect_error", (connectionError) => {
          clearTimeout(timer);
          resolve(connectionError);
        });
      });

      expect(error.message).toMatch(/websocket error|Origin is not allowed/i);
    } finally {
      socket.disconnect();
    }
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
