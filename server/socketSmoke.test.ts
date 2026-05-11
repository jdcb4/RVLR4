// @vitest-environment node

import http from "node:http";
import type { AddressInfo } from "node:net";

import express from "express";
import { Server } from "socket.io";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { RoomSyncPayload } from "@/multiplayer/roomTypes";

import { registerHttpRoutes } from "./httpRoutes.ts";
import { RoomStore } from "./roomStore.ts";
import { registerSocketHandlers } from "./socketHandlers.ts";

type TestHarness = {
  readonly url: string;
  readonly close: () => Promise<void>;
};

async function bootHarness(): Promise<TestHarness> {
  const app = express();
  app.use(express.json());

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
    close: () =>
      new Promise<void>((resolve) => {
        io.close(() => {
          server.close(() => resolve());
        });
      }),
  };
}

type Credentials = {
  readonly code: string;
  readonly playerId: string;
  readonly secret: string;
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

function bindClient(
  url: string,
  creds: Credentials,
): Promise<{ socket: ClientSocket; firstSync: RoomSyncPayload }> {
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

function emitAck<TAck = { ok?: boolean; error?: string }>(
  socket: ClientSocket,
  event: string,
  payload: unknown,
): Promise<TAck> {
  return new Promise((resolve) => {
    socket.emit(event, payload, (ack: TAck) => resolve(ack));
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

  it(
    "hosts a Who What Where lobby, lets a guest join, marks ready, and starts the match",
    async () => {
      // 1. Host creates the room over HTTP.
      const host = await postJson<Credentials>(`${harness.url}/api/rooms`, {
        gameKind: "whowhatwhere",
        hostName: "Host",
      });

      // 2. Three guests join (WhoWhatWhere needs 2 teams x ≥2 players each).
      const guests: Credentials[] = [];
      for (const name of ["G1", "G2", "G3"]) {
        guests.push(
          await postJson<Credentials>(
            `${harness.url}/api/rooms/${host.code}/join`,
            { name },
          ),
        );
      }

      // 3. Everyone connects a socket and binds their session.
      const hostBound = await bindClient(harness.url, host);
      const guestBounds = [];
      for (const guest of guests) {
        guestBounds.push(await bindClient(harness.url, guest));
      }

      try {
        expect(hostBound.firstSync.code).toBe(host.code);
        expect(hostBound.firstSync.phase).toBe("lobby");
        expect(hostBound.firstSync.you.isHost).toBe(true);
        for (const bound of guestBounds) {
          expect(bound.firstSync.you.isHost).toBe(false);
        }

        // 4. Each guest marks ready (host is not required to ready themselves).
        for (const bound of guestBounds) {
          const ack = await emitAck(bound.socket, "lobby:setReady", {
            ready: true,
          });
          expect(ack).toEqual({ ok: true });
        }

        // 5. Host starts the match; everyone receives a sync with phase=playing.
        const playingPromises = [hostBound, ...guestBounds].map((bound) =>
          nextSync(bound.socket),
        );
        const startAck = await emitAck(hostBound.socket, "lobby:startGame", {});
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
    },
    10_000,
  );

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
});
