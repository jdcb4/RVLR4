import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import type { RoomSyncPayload } from "@/multiplayer/roomTypes";
import { requestSocketAck } from "@/services/networkRequests";

const SOCKET_PATH = "/socket.io";

function connectSocket(): Socket {
  return io({
    path: SOCKET_PATH,
    autoConnect: false,
    transports: ["websocket", "polling"],
  });
}

export type SessionCredentials = {
  readonly code: string;
  readonly playerId: string;
  readonly secret: string;
};

export function persistSession(creds: SessionCredentials) {
  sessionStorage.setItem(sessionKey(creds.code), JSON.stringify(creds));
}

export function loadSession(code: string): SessionCredentials | null {
  const raw = sessionStorage.getItem(sessionKey(code));

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SessionCredentials;

    if (
      typeof parsed.code !== "string" ||
      typeof parsed.playerId !== "string" ||
      typeof parsed.secret !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearSession(code: string) {
  sessionStorage.removeItem(sessionKey(code));
}

function sessionKey(code: string) {
  return `jd-multiplayer:${code.toUpperCase()}`;
}

export type RoomChannelHandle = {
  readonly socket: Socket;
  readonly sync: RoomSyncPayload | null;
  readonly connected: boolean;
  readonly bindError: string | null;
  /**
   * True after the server emits `server:shuttingDown` (graceful shutdown on
   * SIGTERM/SIGINT). UI should show a "server restarting" banner; the socket
   * will disconnect shortly after.
   */
  readonly shuttingDown: boolean;
  readonly retryConnection: () => void;
  readonly actionError: string | null;
  readonly clearActionError: () => void;
  readonly emitWithAck: (
    event: string,
    payload?: unknown,
  ) => Promise<{ ok?: boolean; error?: string } | undefined>;
};

export function useRoomChannel(code: string | undefined, enabled: boolean): RoomChannelHandle {
  const socketRef = useRef<Socket | null>(null);
  const bindAttemptRef = useRef(0);
  const [sync, setSync] = useState<RoomSyncPayload | null>(null);
  const [connected, setConnected] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);
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
    setShuttingDown(false);
    setActionError(null);
    if (!enabled || !code) {
      socket.disconnect();
      return undefined;
    }

    if (!loadSession(code)) {
      setBindError("Missing session. Go back and enter your name again.");
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
        socket.disconnect();
        return;
      }

      void requestSocketAck(socket, "session:bind", creds).then((ack) => {
        if (bindAttempt !== bindAttemptRef.current || !socket.connected) {
          return;
        }

        if (ack?.ok === true) {
          setBindError(null);
          setConnected(true);
        } else {
          setConnected(false);
          setBindError(ack?.error ?? "Unable to reconnect.");
        }
      });
    };

    const handleDisconnect = () => {
      bindAttemptRef.current += 1;
      setConnected(false);
    };

    const handleShutdown = () => {
      setShuttingDown(true);
    };

    const handleConnectError = () => {
      setConnected(false);
      setBindError("Could not connect to the room. Check your connection, then retry.");
    };

    socket.on("connect", bindSession);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);
    socket.on("room:sync", handleSync);
    socket.on("server:shuttingDown", handleShutdown);

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
      socket.disconnect();
    };
  }, [code, enabled, socket]);

  const emitWithAck = useCallback(
    (event: string, payload?: unknown) => {
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
    shuttingDown,
    retryConnection,
    actionError,
    clearActionError: () => setActionError(null),
    emitWithAck,
  };
}
