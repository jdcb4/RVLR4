# Implementation Guide — Audit Follow-ups

Companion to [`AUDIT_2026-05-11.md`](AUDIT_2026-05-11.md). Each task below is **self-contained**: do them in order, one PR per task, with the listed version bump and changelog entry.

## Conventions for every task

Before you start any task:

1. Read [`AGENTS.md`](../AGENTS.md). Hard rules apply.
2. Read [`docs/PROJECT_INDEX.md`](PROJECT_INDEX.md) for folder layout.
3. The repo uses **PowerShell on Windows for local dev** and **pnpm**. Do not chain commands with `&&`. Use `;` or separate calls.

Every task ends with **the same verification block**. Run all of it before committing:

```powershell
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
```

If the task touches `server/` or `src/features/multiplayer/`, also run two browsers against `pnpm run dev` and walk the smoke section of [`docs/MULTIPLAYER_QA.md`](MULTIPLAYER_QA.md). Record skipped steps in the PR description.

Every task must:

- Bump `package.json` `version` per [`docs/VERSIONING.md`](VERSIONING.md) (this guide tells you which tier).
- Add an entry at the top of [`docs/CHANGELOG.md`](CHANGELOG.md).
- Include `package.json`, `docs/CHANGELOG.md`, and the code changes in the **same commit**.

Do **not** introduce new top-level dependencies unless the task explicitly tells you to. If a task tells you to add one, also add an entry to [`docs/DECISIONS.md`](DECISIONS.md) following the existing ADR-lite format.

If a task is blocked, **stop and report**. Do not freelance fixes; do not weaken tests; do not skip verification.

---

# Task 1 — `handle(...)` wrapper for socket handlers

**Version bump:** PATCH. Refactor only — no behaviour change intended.

**Why:** [`server/socketHandlers.ts`](../server/socketHandlers.ts) has ~30 listeners that repeat the same `try { … ack({ok:true}) } catch { ack({ok:false, error}) }` shape. Fallow flags 11 clone groups (141 lines) here. The wrapper is a prerequisite for Task 2.

## Files

- Create: `server/socketHandle.ts`
- Edit: `server/socketHandlers.ts`

## Steps

### 1. Create `server/socketHandle.ts`

```ts
import type { Socket } from "socket.io";

import type { Room, RoomPlayer, RoomStore } from "./roomStore.ts";

export type SocketAck = (payload?: { ok?: boolean; error?: string }) => void;

export type HandlerContext = {
  readonly socket: Socket;
  readonly store: RoomStore;
  readonly room: Room;
  readonly actor: RoomPlayer;
};

function requireActor(
  socket: Socket,
  store: RoomStore,
): { room: Room; actor: RoomPlayer } {
  const code = socket.data.roomCode as string | undefined;
  const playerId = socket.data.playerId as string | undefined;

  if (!code || !playerId) {
    throw new Error("Join the room before sending commands.");
  }

  const room = store.getRoom(code);

  if (!room) {
    throw new Error("That room no longer exists.");
  }

  const actor = room.players.get(playerId);

  if (!actor) {
    throw new Error("Player record missing.");
  }

  return { room, actor };
}

/**
 * Registers a Socket.IO handler that:
 * - looks up the actor + room from `socket.data`,
 * - awaits `fn`,
 * - acks `{ ok: true }` on success or `{ ok: false, error }` on throw.
 *
 * `fallbackErrorMessage` is what the client sees if the thrown value is not an Error.
 */
export function registerHandler<TPayload>(
  socket: Socket,
  store: RoomStore,
  event: string,
  fallbackErrorMessage: string,
  fn: (ctx: HandlerContext, payload: TPayload) => Promise<void> | void,
) {
  socket.on(event, async (payload: TPayload, ack?: SocketAck) => {
    try {
      const { room, actor } = requireActor(socket, store);

      await fn({ socket, store, room, actor }, payload);
      ack?.({ ok: true });
    } catch (error) {
      ack?.({
        ok: false,
        error: error instanceof Error ? error.message : fallbackErrorMessage,
      });
    }
  });
}
```

### 2. Edit `server/socketHandlers.ts`

For **every** handler currently of the form below…

```ts
socket.on("lobby:setReady", async (payload: { ready?: boolean }, ack?: SocketAck) => {
  try {
    const { room, actor } = requireActor(socket, store);
    actor.ready = Boolean(payload.ready);
    await broadcastRoom(io, store, room.code);
    ack?.({ ok: true });
  } catch (error) {
    ack?.({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update ready state.",
    });
  }
});
```

…rewrite as:

```ts
registerHandler<{ ready?: boolean }>(
  socket,
  store,
  "lobby:setReady",
  "Unable to update ready state.",
  async ({ room, actor }, payload) => {
    actor.ready = Boolean(payload.ready);
    await broadcastRoom(io, store, room.code);
  },
);
```

Notes:

- The `disconnect` handler at the bottom of the file is **not** wrapped — it has no ack and a unique shape. Leave it as is.
- The two inner helpers (`ensureLobbyEveryoneReady`, `canOfferReplay`) move with their callers but their bodies don't change.
- Delete the local `requireActor` at the bottom of `socketHandlers.ts` after migration — `registerHandler` uses the one in `socketHandle.ts`.
- Keep the existing event names and error strings exactly. The smoke matrix depends on them.

### 3. Verify

```powershell
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
pnpm dlx fallow --no-cache --format human
```

Fallow's "clones in `server/socketHandlers.ts`" count should drop materially. If it doesn't, you haven't migrated every handler.

Manual: `pnpm run dev`, host a Hat room from one browser, join from another, ready up, start a turn, mark Correct, end turn. Confirm acks behave normally.

### 4. Commit

```
refactor(server): handler wrapper for socket events

Version-affecting: PATCH (no behaviour change).
```

Changelog entry under a new `0.14.2` heading:

```md
## 0.14.2 - <date>

- **Refactor:** `server/socketHandle.ts` — `registerHandler` wrapper centralizes
  the try/ack/`requireActor` pattern shared by every Socket.IO listener;
  `socketHandlers.ts` migrated. No behaviour change.
```

---

# Task 2 — Zod-validate socket payloads

**Version bump:** PATCH. Hardening; no new features.

**Why:** Today payloads are typed via `payload: { teamIndex?: number }` and coerced with `Number()`. [`SECURITY.md`](../SECURITY.md) and [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) both list Socket.IO events as a Zod validation surface. We are not currently meeting that bar.

**Prerequisite:** Task 1 must be done.

## Files

- Create: `server/socketSchemas.ts`
- Edit: `server/socketHandle.ts`
- Edit: `server/socketHandlers.ts`

## Steps

### 1. Create `server/socketSchemas.ts`

One schema per event. Use the existing `Number()` / `String()` / range checks in `socketHandlers.ts` as the **source of truth** for what each schema must accept. Example:

```ts
import { z } from "zod";

import { GAME_DEFAULTS } from "@/config/hatGameDefaults";
import { TEAM_COUNT_OPTIONS } from "@/config/teamRoster";

const teamCountSchema = z
  .number()
  .int()
  .refine((value): value is 2 | 3 | 4 =>
    (TEAM_COUNT_OPTIONS as readonly number[]).includes(value),
  );

const playerNameSchema = z.string().max(64);

export const socketSchemas = {
  "session:bind": z.object({
    code: z.string().min(1),
    playerId: z.string().min(1),
    secret: z.string().min(1),
  }),
  "room:optOutResume": z.object({}).optional(),
  "lobby:setReady": z.object({ ready: z.boolean() }),
  "lobby:setName": z.object({ name: playerNameSchema }),
  "lobby:moveSelf": z.object({ teamIndex: z.number().int().min(0).max(3) }),
  "lobby:hostMovePlayer": z.object({
    playerId: z.string().min(1),
    teamIndex: z.number().int().min(0).max(3),
  }),
  "lobby:hostSetTeamCount": z.object({ teamCount: teamCountSchema }),
  "lobby:hostSetTeamName": z.object({
    teamIndex: z.number().int().min(0).max(3),
    name: z.string().max(40),
  }),
  "lobby:captainSetTeamName": z.object({
    teamIndex: z.number().int().min(0).max(3),
    name: z.string().max(40),
  }),
  "lobby:hostPatchWhoWhatWhereSettings": z.unknown(), // delegate to existing hostPatchWhoWhatWhereSettings validation
  "lobby:hostPatchHatPrefs": z.unknown(),    // ditto
  "lobby:hostPatchImposterCounts": z.unknown(),
  "lobby:startGame": z.object({}).optional(),
  "lobby:hatSetClueCell": z.object({
    clueIndex: z.number().int().min(0).max(GAME_DEFAULTS.cluesPerPlayer - 1),
    value: z.string().max(GAME_DEFAULTS.maxClueLength),
  }),
  "lobby:hatSuggestClue": z.object({
    clueIndex: z.number().int().min(0).max(GAME_DEFAULTS.cluesPerPlayer - 1),
  }),
  "imposter:dispatch": z.unknown(), // delegate to applyImposterDispatch's existing checks
  "game:hostOfferReplay": z.object({}).optional(),
  "game:acceptReplay": z.object({}).optional(),
  "www:markReady": z.object({}).optional(),
  "www:startTurn": z.object({}).optional(),
  "www:correct": z.object({}).optional(),
  "www:skip": z.object({}).optional(),
  "www:returnSkipped": z.object({ word: z.string() }), // confirm shape from current handler
  "www:endTurn": z.object({}).optional(),
  "www:finalScores": z.object({}).optional(),
  "hat:startTurn": z.object({}).optional(),
  "hat:endTurn": z.object({}).optional(),
  "hat:markCorrect": z.object({}).optional(),
  "hat:skipClue": z.object({}).optional(),
  "hat:returnSkipped": z.object({ clueId: z.string() }), // confirm shape
  "hat:viewResults": z.object({}).optional(),
} as const;

export type SocketEventName = keyof typeof socketSchemas;
export type SocketPayload<E extends SocketEventName> = z.infer<
  (typeof socketSchemas)[E]
>;
```

For events marked `z.unknown()`, **do not** weaken the existing inner validation in `hostPatchWhoWhatWhereSettings`, `hostPatchHatPrefs`, `applyImposterDispatch`, etc. The plan is to lift those into real schemas later; for now, preserve current behaviour.

Before you ship, audit every `payload.X` access in `socketHandlers.ts` (use `Grep` for `payload\.`) and reconcile each one with a schema field. If a handler reads a field that doesn't exist in the schema, the schema is wrong — fix the schema, don't drop the field.

### 2. Update `server/socketHandle.ts`

Change `registerHandler` to accept and apply a schema:

```ts
import type { ZodSchema } from "zod";

export function registerHandler<E extends SocketEventName>(
  socket: Socket,
  store: RoomStore,
  event: E,
  fallbackErrorMessage: string,
  fn: (ctx: HandlerContext, payload: SocketPayload<E>) => Promise<void> | void,
) {
  const schema = socketSchemas[event] as ZodSchema;

  socket.on(event, async (rawPayload: unknown, ack?: SocketAck) => {
    try {
      const { room, actor } = requireActor(socket, store);

      const parseResult = schema.safeParse(rawPayload);

      if (!parseResult.success) {
        throw new Error("Invalid request.");
      }

      await fn({ socket, store, room, actor }, parseResult.data as SocketPayload<E>);
      ack?.({ ok: true });
    } catch (error) {
      ack?.({
        ok: false,
        error: error instanceof Error ? error.message : fallbackErrorMessage,
      });
    }
  });
}
```

Import `socketSchemas`, `SocketEventName`, `SocketPayload` from the new schemas file.

### 3. Update `server/socketHandlers.ts`

- The handler bodies no longer need `Number(...)` / `String(...)` coercion — the payload is already the right type. Remove those casts where they are now redundant.
- `session:bind` is still a `socket.on(...)` directly (not via `registerHandler`) because it doesn't have an actor yet. Wrap it manually with the same `safeParse` pattern.

### 4. Verify

```powershell
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
```

Manual: walk the **Smoke** + one game section of [`docs/MULTIPLAYER_QA.md`](MULTIPLAYER_QA.md). The user-facing error string for malformed payloads is "Invalid request." — that is the only new visible string.

### 5. Commit + changelog

```md
## 0.14.3 - <date>

- **Server:** All Socket.IO event payloads validated through Zod
  (`server/socketSchemas.ts`); rejected payloads ack `{ ok: false, error: "Invalid request." }`
  before any state mutation.
```

---

# Task 3 — Fail-fast CORS in production

**Version bump:** PATCH. Deployment hardening.

**Why:** Today, if `CLIENT_ORIGIN` is unset in production, [`server/index.ts:32`](../server/index.ts) resolves `corsOrigin` to `true` (allow-any).

## Files

- Edit: `server/env.ts`
- Edit: `server/index.ts`
- Edit: `docs/DEPLOYMENT.md` (note the new requirement)

## Steps

### 1. `server/env.ts`

Add a `superRefine` to the schema so that `NODE_ENV === "production"` requires `CLIENT_ORIGIN`:

```ts
const ServerEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    CLIENT_ORIGIN: z.string().optional(),
    MULTIPLAYER_DEBUG: z
      .string()
      .optional()
      .transform((value) => value === "1" || value?.toLowerCase() === "true"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") {
      return;
    }

    const origins = env.CLIENT_ORIGIN?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (!origins || origins.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CLIENT_ORIGIN"],
        message:
          "CLIENT_ORIGIN must be set in production (comma-separated list of allowed browser origins).",
      });
    }
  });
```

### 2. `server/index.ts`

Replace the current `corsOrigin` block. The fallback to `true` is gone. In production, `allowedOrigins` is now guaranteed non-empty by the schema:

```ts
const allowedOrigins =
  env.CLIENT_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean) ?? [];

const corsOrigin =
  allowedOrigins.length > 0
    ? allowedOrigins
    : env.NODE_ENV === "development"
      ? ["http://localhost:5173"]
      : false; // unreachable in prod thanks to schema, but defensive
```

### 3. `docs/DEPLOYMENT.md`

Add a short section under "Environment":

```md
### Required production env vars

- `CLIENT_ORIGIN` — comma-separated list of allowed browser origins
  (`https://app.example.com,https://www.example.com`). The server refuses to
  start in production without it.
```

### 4. Verify

```powershell
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
```

Manual production smoke (optional but recommended):

```powershell
$env:NODE_ENV="production"; pnpm run build; pnpm run start
# Expect: process exits with a Zod error mentioning CLIENT_ORIGIN.
$env:NODE_ENV="production"; $env:CLIENT_ORIGIN="http://localhost:3001"; pnpm run start
# Expect: server starts.
```

Remember to clear those env vars when you're done.

### 5. Commit + changelog

```md
## 0.14.4 - <date>

- **Server:** `CLIENT_ORIGIN` is now **required** in production
  (`loadServerEnv` fails fast). Replaces the previous fallback that resolved to
  `cors({ origin: true })` (allow-any) when the variable was unset.
- **Docs:** `docs/DEPLOYMENT.md` documents the new requirement.
```

---

# Task 4 — Graceful shutdown on SIGTERM

**Version bump:** PATCH.

**Why:** Railway/Docker send `SIGTERM` on deploy. Today the Node process is killed mid-match with no client notification.

## Files

- Edit: `server/index.ts`
- Edit: `src/multiplayer/useRoomChannel.ts`
- Edit: `src/features/multiplayer/RoomPage.tsx` (small UI change)

## Steps

### 1. `server/index.ts`

After `server.listen(...)`, add:

```ts
function shutdown(signal: string) {
  console.log(`[server] received ${signal}, shutting down`);

  io.emit("server:shuttingDown");

  // Give clients ~500ms to receive the event before closing.
  setTimeout(() => {
    io.close(() => {
      server.close(() => {
        process.exit(0);
      });
    });
  }, 500);

  // Hard exit after 5s if anything hangs.
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

Do **not** clear room state here — the process is exiting; let GC handle it.

### 2. `src/multiplayer/useRoomChannel.ts`

Inside the `useEffect` that registers socket listeners, add:

```ts
const handleShutdown = () => {
  setShuttingDown(true);
};

socket.on("server:shuttingDown", handleShutdown);
```

Add `shuttingDown` to the returned state and the `useState` near `bindError`:

```ts
const [shuttingDown, setShuttingDown] = useState(false);
```

Return `shuttingDown` from the hook and add it to `RoomChannelHandle`. Remember to `socket.off("server:shuttingDown", handleShutdown)` in the cleanup.

### 3. `src/features/multiplayer/RoomPage.tsx`

Destructure `shuttingDown` from `useRoomChannel(...)`. Render a banner at the top of the page **only when `shuttingDown` is true**:

```tsx
{shuttingDown && (
  <div
    role="status"
    aria-live="polite"
    className="rounded-lg bg-semantic-warning-soft px-4 py-2 text-typ-ui"
  >
    The server is restarting. The room will reopen in a moment — keep this tab open.
  </div>
)}
```

Use whichever `bg-semantic-*` class actually exists in `src/themes/default.css`. **Check before inventing one.** If there is no warning surface, fall back to `bg-muted` and a regular border.

### 4. Verify

```powershell
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
```

Manual: `pnpm run dev`, host + join a room, then press **Ctrl+C** in the terminal. Both browsers should briefly show the restart banner before the server exits.

### 5. Commit + changelog

```md
## 0.14.5 - <date>

- **Server:** `SIGTERM` / `SIGINT` trigger a 500ms graceful shutdown — the server
  emits `server:shuttingDown` so clients can warn the user before connections drop.
- **Client:** `useRoomChannel` exposes `shuttingDown`; `RoomPage` shows a status
  banner when the server is restarting.
```

---

# Task 5 — `server/roomStore.test.ts`

**Version bump:** PATCH. New tests only.

**Why:** Zero server-side test coverage today. Start with the deterministic pure-data class.

## Files

- Create: `server/roomStore.test.ts`

## Steps

### 1. Mirror the style of [`src/domain/whowhatwhere/setup.test.ts`](../src/domain/whowhatwhere/setup.test.ts)

Use Vitest's `describe` / `it` / `expect`. The project already runs tests on `.ts` files in `server/` (confirm by checking `vitest.config.ts` or `vite.config.ts`; if `server/**` is excluded, **add a glob** rather than moving the test).

### 2. Tests to write

Minimum set:

```ts
import { describe, expect, it } from "vitest";

import { RoomStore } from "./roomStore.ts";

describe("RoomStore.createRoom", () => {
  it("creates a Who What Where room with a host player and 2 default teams", () => {
    const store = new RoomStore();
    const { room, hostPlayer } = store.createRoom({
      gameKind: "whowhatwhere",
      hostName: "Alice",
    });

    expect(room.gameKind).toBe("whowhatwhere");
    expect(room.phase).toBe("lobby");
    expect(room.teamCount).toBe(2);
    expect(room.teamNames).toHaveLength(2);
    expect(hostPlayer.isHost).toBe(true);
    expect(hostPlayer.name).toBe("Alice");
  });

  it("trims and caps the host display name at 32 chars", () => {
    const store = new RoomStore();
    const long = "x".repeat(50);
    const { hostPlayer } = store.createRoom({
      gameKind: "hat",
      hostName: long,
    });

    expect(hostPlayer.name).toHaveLength(32);
  });

  it("falls back to 'Host' when the trimmed name is empty", () => {
    const store = new RoomStore();
    const { hostPlayer } = store.createRoom({
      gameKind: "imposter",
      hostName: "   ",
    });

    expect(hostPlayer.name).toBe("Host");
  });
});

describe("RoomStore.joinRoom", () => {
  it("balances new joiners across the smallest team", () => {
    const store = new RoomStore();
    const { room } = store.createRoom({ gameKind: "whowhatwhere", hostName: "A" });

    const { player: p2 } = store.joinRoom({ code: room.code, name: "B" });
    const { player: p3 } = store.joinRoom({ code: room.code, name: "C" });

    expect(p2.teamIndex).toBe(1);
    expect(p3.teamIndex === 0 || p3.teamIndex === 1).toBe(true);
  });

  it("rejects joins once the imposter room is full", () => {
    // Use IMPOSTER_MAX_PLAYERS from `@/config/imposterDefaults`.
    // Fill the room to capacity and assert the next join throws.
  });

  it("rejects joins after the lobby has started", () => {
    const store = new RoomStore();
    const { room } = store.createRoom({ gameKind: "hat", hostName: "A" });
    room.phase = "playing";

    expect(() => store.joinRoom({ code: room.code, name: "B" })).toThrow();
  });
});

describe("RoomStore.authenticate", () => {
  it("returns the player when the secret matches", () => {
    const store = new RoomStore();
    const { room, hostPlayer } = store.createRoom({
      gameKind: "hat",
      hostName: "Host",
    });

    expect(
      store.authenticate({
        code: room.code,
        playerId: hostPlayer.id,
        secret: hostPlayer.secret,
      })?.id,
    ).toBe(hostPlayer.id);
  });

  it("returns null on a wrong secret", () => {
    const store = new RoomStore();
    const { room, hostPlayer } = store.createRoom({
      gameKind: "hat",
      hostName: "Host",
    });

    expect(
      store.authenticate({
        code: room.code,
        playerId: hostPlayer.id,
        secret: "wrong",
      }),
    ).toBeNull();
  });
});
```

Fill in the imposter capacity test using the constants already exported from `@/config/imposterDefaults`.

### 3. Verify

```powershell
pnpm run typecheck
pnpm test -- server/roomStore.test.ts
pnpm run lint
pnpm run build
```

### 4. Commit + changelog

```md
## 0.14.6 - <date>

- **Tests:** `server/roomStore.test.ts` covers room creation, join balancing,
  imposter capacity, lobby-phase enforcement, and `authenticate` happy/fail paths.
```

---

# Task 6 — Socket.IO integration smoke test

**Version bump:** PATCH.

**Why:** A single happy-path test that exercises real Socket.IO would have caught the import-shape bugs in 0.13.2 / 0.13.3 / 0.14.1.

## Files

- Create: `server/__tests__/socketSmoke.test.ts`

## Steps

### 1. Pattern

The test should not need a separate process. Use `http.createServer`, attach Socket.IO, attach two `socket.io-client` instances, and walk through:

```
1. POST /api/rooms → host gets {code, playerId, secret}
2. host socket: emit session:bind → ack ok
3. POST /api/rooms/:code/join → guest gets {playerId, secret}
4. guest socket: emit session:bind → ack ok
5. Both sockets receive at least one room:sync with phase=lobby
6. guest emits lobby:setReady (true) → host's next sync shows guest.ready=true
7. host emits lobby:startGame → both receive sync with phase=playing
```

Use `supertest` for the REST step. **Do not** add `supertest` as a new dependency — check `package.json`. If it isn't there, use `node:http` and `fetch` instead (Node 22 has global `fetch`).

### 2. Skeleton (do not copy verbatim — check imports against the codebase)

```ts
import http from "node:http";
import { AddressInfo } from "node:net";

import express from "express";
import { describe, expect, it } from "vitest";
import { io as ioClient } from "socket.io-client";
import { Server } from "socket.io";

import { registerHttpRoutes } from "../httpRoutes.ts";
import { RoomStore } from "../roomStore.ts";
import { registerSocketHandlers } from "../socketHandlers.ts";

async function bootTestServer() {
  const app = express();
  app.use(express.json());
  const store = new RoomStore();
  registerHttpRoutes(app, store);
  const server = http.createServer(app);
  const io = new Server(server);
  registerSocketHandlers(io, store);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;
  return {
    url,
    close: () =>
      new Promise<void>((resolve) => {
        io.close(() => server.close(() => resolve()));
      }),
  };
}

describe("multiplayer smoke", () => {
  it("hosts a Who What Where lobby, lets a guest join, and starts the match", async () => {
    const { url, close } = await bootTestServer();

    try {
      const hostResp = await fetch(`${url}/api/rooms`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gameKind: "whowhatwhere", hostName: "Host" }),
      });
      const host = (await hostResp.json()) as {
        code: string;
        playerId: string;
        secret: string;
      };

      // …connect host + guest, walk through the steps above…

      // Always assert acks and at least one sync per side.
    } finally {
      await close();
    }
  }, 10_000);
});
```

Wait for `room:sync` deterministically — listen with `socket.once("room:sync", resolve)` inside a `Promise`, **don't** `setTimeout`-poll.

### 3. Verify

```powershell
pnpm run typecheck
pnpm test
pnpm run lint
pnpm run build
```

The test should run in under 2 seconds. If it hangs, you are waiting on an ack that was never sent — check the actor `session:bind` step.

### 4. Commit + changelog

```md
## 0.14.7 - <date>

- **Tests:** `server/__tests__/socketSmoke.test.ts` — first end-to-end
  Socket.IO integration test (host + guest, lobby → playing for Who What Where).
```

---

# Task 7 — Extract `MultiplayerTurnView` shell

**Version bump:** PATCH (refactor) or MINOR if the visual diff is non-trivial — decide once you see it. Default to PATCH.

**Why:** Fallow's largest cross-file clone is 75 lines between [`HatMultiplayerView.tsx`](../src/features/multiplayer/HatMultiplayerView.tsx) and [`WhoWhatWhereMultiplayerView.tsx`](../src/features/multiplayer/WhoWhatWhereMultiplayerView.tsx). The 19-line clone also appears in [`ImposterMultiplayerView.tsx`](../src/features/multiplayer/ImposterMultiplayerView.tsx).

**Prerequisite:** Tasks 5 and 6 give you safety nets.

## Files

- Create: `src/features/multiplayer/MultiplayerTurnView.tsx`
- Edit: `src/features/multiplayer/HatMultiplayerView.tsx`
- Edit: `src/features/multiplayer/WhoWhatWhereMultiplayerView.tsx`
- Edit: `src/features/multiplayer/ImposterMultiplayerView.tsx`

## Steps

### 1. Identify the shared block

Open both files at the line ranges fallow reported:

- `HatMultiplayerView.tsx:320-381` ↔ `WhoWhatWhereMultiplayerView.tsx:229-303`
- `HatMultiplayerView.tsx:296-336` ↔ `WhoWhatWhereMultiplayerView.tsx:205-245`
- `HatMultiplayerView.tsx:320-338` ↔ `ImposterMultiplayerView.tsx:145-163` ↔ `WhoWhatWhereMultiplayerView.tsx:229-247`

Read all three side by side. Identify the **stable** structural pieces (header, timer row, spectator banner) vs **game-specific** content. The shared shell receives the game-specific content as children/props.

### 2. Build the shared component

```tsx
type MultiplayerTurnViewProps = {
  readonly header: React.ReactNode;
  readonly spectatorBanner?: React.ReactNode;
  readonly timerRow?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly footer?: React.ReactNode;
};

export function MultiplayerTurnView({
  header,
  spectatorBanner,
  timerRow,
  children,
  footer,
}: MultiplayerTurnViewProps) {
  // …structure copied from the smaller of the two clones…
}
```

Resolve any styling differences by picking **one** representation and noting the change in the PR description. Do **not** add a `variant` prop or a `gameKind` discriminator — that is the abstraction we are trying to avoid.

### 3. Migrate one view at a time

- Migrate `WhoWhatWhereMultiplayerView.tsx` first (smaller).
- Run the verification block (below).
- Then `HatMultiplayerView.tsx`.
- Then `ImposterMultiplayerView.tsx` (only the 19-line block — don't force the rest of that file through the shell).

After each file, walk the relevant section of [`docs/MULTIPLAYER_QA.md`](MULTIPLAYER_QA.md) for that game.

### 4. Verify

```powershell
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
pnpm dlx fallow --no-cache --format human
```

Fallow's "clones across multiplayer views" group should shrink or disappear.

### 5. Commit + changelog

```md
## 0.14.8 - <date>

- **Refactor:** `MultiplayerTurnView` (shared header + spectator banner + timer
  scaffolding) replaces the duplicated turn shells across Hat, Who What Where,
  and Imposter multiplayer views. No intended UX change.
```

---

# Task 8 — Connection-state banner in `RoomPage`

**Version bump:** PATCH.

**Why:** `useRoomChannel` already exposes `connected` and `bindError`, but most surfaces ignore them. When the server briefly drops, players see frozen UI.

## Files

- Edit: `src/features/multiplayer/RoomPage.tsx`

## Steps

### 1. Read existing exposed state

`useRoomChannel` returns `{ connected, bindError, ... }`. After Task 4 it also returns `shuttingDown`.

### 2. Add a 2-second debounce

Pure UI delay — do **not** add an external dep. Inline:

```tsx
const [showOffline, setShowOffline] = useState(false);

useEffect(() => {
  if (connected) {
    setShowOffline(false);
    return undefined;
  }

  const timer = window.setTimeout(() => setShowOffline(true), 2000);
  return () => window.clearTimeout(timer);
}, [connected]);
```

### 3. Render order

Show banners in priority order: `bindError` (fatal, no retry possible by the user) > `shuttingDown` > `showOffline`.

```tsx
{bindError && (
  <div role="alert" aria-live="assertive" className="… your error styling …">
    {bindError}
  </div>
)}

{!bindError && shuttingDown && (
  <div role="status" aria-live="polite" className="…">
    The server is restarting. Keep this tab open.
  </div>
)}

{!bindError && !shuttingDown && showOffline && (
  <div role="status" aria-live="polite" className="…">
    Reconnecting…
  </div>
)}
```

Pick existing Tailwind utilities only — do not invent new semantic colors. If you need a new token, stop and surface it.

### 4. Verify

```powershell
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
```

Manual: with `pnpm run dev`, join a room, then `Ctrl+C` the server. After ~2s the "Reconnecting…" banner appears; restart the server and the banner disappears.

### 5. Commit + changelog

```md
## 0.14.9 - <date>

- **Multiplayer UX:** `RoomPage` shows a polite "Reconnecting…" banner after
  the socket has been disconnected for 2s, and surfaces fatal `bindError`
  messages instead of leaving the lobby frozen.
```

---

# Task 9 — `prefers-reduced-motion` for confetti

**Version bump:** PATCH.

**Why:** Confetti animates on final results with no opt-out — accessibility miss for the 5–10% of users with reduced motion set.

## Files

- Find the file that defines the `confetti-fall` keyframe (start with `tailwind.config.ts`; the actual component is referenced from `final-results/` — grep `ResultsConfetti`).
- Edit whichever CSS or component owns the animation.

## Steps

### 1. Locate the keyframes

```powershell
# In your tools, grep for:
confetti-fall
ResultsConfetti
```

The animation is defined in `tailwind.config.ts` and applied via a Tailwind utility class on the component.

### 2. Two acceptable fixes — pick one

**Option A (preferred): CSS media query in the global stylesheet.** In `src/index.css` (or whichever stylesheet is already imported globally), add:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-confetti-fall {
    animation: none;
  }
}
```

Replace `.animate-confetti-fall` with the actual class name applied by `ResultsConfetti`.

**Option B: React hook.** Use a `useReducedMotion` helper:

```ts
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
```

Then early-return `null` from `ResultsConfetti` when `useReducedMotion()` is true.

Option A is simpler; prefer it unless the component needs to know for other reasons.

### 3. Verify

```powershell
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
```

Manual: in DevTools → Rendering → Emulate CSS media feature → `prefers-reduced-motion: reduce`. Finish a game; confetti should not animate.

### 4. Commit + changelog

```md
## 0.14.10 - <date>

- **A11y:** `ResultsConfetti` respects `prefers-reduced-motion`; users with the
  OS setting enabled no longer see the fall animation on final results.
```

---

# Tasks deferred (not in this guide)

These were called out in the audit but **do not implement** without checking back with the user first:

- **Refactor `RoomPage.tsx` / `ImposterMultiplayerView.tsx` into smaller files.** Mechanical but large — needs design judgement (where to draw component boundaries). Pair with the user before starting.
- **Rate limiting.** Adds a runtime dependency (`express-rate-limit`) and requires a `docs/DECISIONS.md` entry.
- **Structured logger (pino, etc.).** Same — new dep, ADR required.
- **Web Share API integration.** Tiny but UX-visible; confirm copy with the user first.
- **Mute toggle for Tone.js cues.** Requires a settings UI surface that doesn't exist yet.
- **`crypto.timingSafeEqual` for `RoomStore.authenticate`.** Worth doing, but trivial — fold into a future security pass alongside any other small hardening.

---

# When you finish all tasks

Run **one full sweep**:

```powershell
pnpm run verify
pnpm dlx fallow --no-cache --format human
```

The fallow report should show:

- Clone groups down materially (target: <20).
- `socketHandlers.ts` no longer the #1 hotspot by cognitive complexity.
- `RoomPage.tsx` complexity unchanged (deferred), and that is OK.

Walk the **Smoke** and one full game from each section of [`docs/MULTIPLAYER_QA.md`](MULTIPLAYER_QA.md). Report any deviations.
