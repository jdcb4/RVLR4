import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import type { EmitWithAck } from "@/domain/multiplayer/protocol";
import type { RoomSyncPayload } from "@/domain/multiplayer/protocol";
import {
  type SessionCredentials,
  sessionCredentialsSchema,
} from "@/domain/multiplayer/sessionCredentials";
import { clearActiveGameBookmark, readActiveGameBookmark } from "@/multiplayer/activeGameBookmark";
import { discardStoredRecord, readStoredJson, roomSessionStorage } from "@/services/browserStorage";
import { requestSocketAck } from "@/services/networkRequests";

const SOCKET_PATH = "/socket.io";

function connectSocket(): Socket {
  return io({
    path: SOCKET_PATH,
    autoConnect: false,
    transports: ["websocket", "polling"],
  });
}

export type { SessionCredentials } from "@/domain/multiplayer/sessionCredentials";

export function persistSession(creds: SessionCredentials) {
  return roomSessionStorage.write(sessionKey(creds.code), JSON.stringify(creds));
}

export function loadSession(code: string): SessionCredentials | null {
  const key = sessionKey(code);
  const raw = readStoredJson(roomSessionStorage, key);
  if (raw === null) return null;
  const parsed = sessionCredentialsSchema.safeParse(raw);
  if (parsed.success && parsed.data.code === code.toUpperCase()) return parsed.data;
  discardStoredRecord(roomSessionStorage, key);
  return null;
}

export function clearSession(code: string) {
  roomSessionStorage.remove(sessionKey(code));
}

function sessionKey(code: string) {
  return `jd-multiplayer:${code.toUpperCase()}`;
}

export type RoomChannelHandle = {
  readonly socket: Socket;
  readonly sync: RoomSyncPayload | null;
  readonly connected: boolean;
  readonly bindError: string | null;
  readonly bindErrorCode: string | null;
  /**
   * True after the server emits `server:shuttingDown` (graceful shutdown on
   * SIGTERM/SIGINT). UI should show a "server restarting" banner; the socket
   * will disconnect shortly after.
   */
  readonly shuttingDown: boolean;
  readonly retryConnection: () => void;
  readonly actionError: string | null;
  readonly clearActionError: () => void;
  readonly emitWithAck: EmitWithAck;
};

export function useRoomChannel(code: string | undefined, enabled: boolean): RoomChannelHandle {
  const socketRef = useRef<Socket | null>(null);
  const bindAttemptRef = useRef(0);
  const [sync, setSync] = useState<RoomSyncPayload | null>(null);
  const [connected, setConnected] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);
  const [bindErrorCode, setBindErrorCode] = useState<string | null>(null);
  const [shuttingDown, setShuttingDown] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const socket = useMemo(() => {
    if (!socketRef.current) {
      socketRef.current = connectSocket();
    }

    return socketRef.current;
  }, []);

  useEffect(() => {
    setConnected(false);
    setSync(null);
    setBindError(null);
    setBindErrorCode(null);
    setShuttingDown(false);
    setActionError(null);
    if (!enabled || !code) {
      socket.disconnect();
      return undefined;
    }

    const forgetSession = () => {
      clearSession(code);
      if (readActiveGameBookmark()?.code === code.toUpperCase()) clearActiveGameBookmark();
    };

    if (!loadSession(code)) {
      forgetSession();
      setBindError("Missing session. Go back and enter your name again.");
      setBindErrorCode("SESSION_EXPIRED");
      return undefined;
    }

    const handleSync = (payload: RoomSyncPayload) => {
      const creds = loadSession(code);
      if (payload.code !== code.toUpperCase() || payload.you.playerId !== creds?.playerId) return;
      setSync(payload);
    };

    const bindSession = () => {
      const creds = loadSession(code);
      const bindAttempt = bindAttemptRef.current + 1;
      bindAttemptRef.current = bindAttempt;
      setConnected(false);
      setShuttingDown(false);

      if (!creds) {
        setBindError("Missing session. Go back and enter your name again.");
        setBindErrorCode("SESSION_EXPIRED");
        socket.disconnect();
        return;
      }

      void requestSocketAck(socket, "session:bind", creds).then((ack) => {
        if (bindAttempt !== bindAttemptRef.current || !socket.connected) {
          return;
        }

        if (ack?.ok === true) {
          setBindError(null);
          setBindErrorCode(null);
          setConnected(true);
        } else {
          setConnected(false);
          setBindError(ack?.error ?? "Unable to reconnect.");
          setBindErrorCode(ack.code ?? null);
          if (ack.code === "ROOM_NOT_FOUND" || ack.code === "SESSION_EXPIRED") {
            forgetSession();
            setSync(null);
            socket.disconnect();
          }
        }
      });
    };

    const handleDisconnect = (reason?: string) => {
      bindAttemptRef.current += 1;
      setConnected(false);
      if (reason === "io server disconnect") {
        setBindError("The room connection was closed. Retry to check whether it still exists.");
      }
    };

    const handleShutdown = () => {
      setShuttingDown(true);
    };

    const handleSessionEnded = (payload: { code: string }) => {
      if (payload.code !== code.toUpperCase()) return;
      forgetSession();
      setSync(null);
      setBindError("You left this lobby in another tab. Join again to take a new seat.");
      setBindErrorCode("SESSION_EXPIRED");
      socket.disconnect();
    };

    const handleRoomExpired = (payload: { code: string }) => {
      if (payload.code !== code.toUpperCase()) return;
      forgetSession();
      setSync(null);
      setBindError("This room expired. Host or join a new room to continue.");
      setBindErrorCode("ROOM_NOT_FOUND");
      socket.disconnect();
    };

    const handleConnectError = () => {
      setConnected(false);
      setBindErrorCode(null);
      setBindError("Could not connect to the room. Check your connection, then retry.");
    };

    socket.on("connect", bindSession);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);
    socket.on("room:sync", handleSync);
    socket.on("server:shuttingDown", handleShutdown);
    socket.on("session:ended", handleSessionEnded);
    socket.on("room:expired", handleRoomExpired);

    if (socket.connected) {
      bindSession();
    } else {
      socket.connect();
    }

    return () => {
      bindAttemptRef.current += 1;
      socket.off("connect", bindSession);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
      socket.off("room:sync", handleSync);
      socket.off("server:shuttingDown", handleShutdown);
      socket.off("session:ended", handleSessionEnded);
      socket.off("room:expired", handleRoomExpired);
      socket.disconnect();
    };
  }, [code, enabled, socket]);

  const emitWithAck = useCallback<EmitWithAck>(
    (...[event, payload]) => {
      if (!connected || !socket.connected || !enabled) {
        return Promise.resolve({ ok: false, error: "Reconnecting to the room." });
      }

      setActionError(null);
      const requestBindAttempt = bindAttemptRef.current;
      return requestSocketAck(socket, event, payload).then((reply) => {
        if (!reply.ok && requestBindAttempt === bindAttemptRef.current)
          setActionError(reply.error ?? "The action did not complete. Try again.");
        return reply;
      });
    },
    [connected, enabled, socket],
  );

  const retryConnection = useCallback(() => {
    if (!enabled || !code) return;
    setBindError(null);
    setConnected(false);
    socket.disconnect().connect();
  }, [code, enabled, socket]);

  return {
    socket,
    sync: enabled && sync?.code === code?.toUpperCase() ? sync : null,
    connected: enabled && connected,
    bindError,
    bindErrorCode,
    shuttingDown,
    retryConnection,
    actionError,
    clearActionError: () => setActionError(null),
    emitWithAck,
  };
}
