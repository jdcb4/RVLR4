import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import type { RoomSyncPayload } from "@/multiplayer/roomTypes";

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
  readonly emitWithAck: (
    event: string,
    payload?: unknown,
  ) => Promise<{ ok?: boolean; error?: string } | undefined>;
};

export function useRoomChannel(
  code: string | undefined,
  enabled: boolean,
): RoomChannelHandle {
  const socketRef = useRef<Socket | null>(null);
  const [sync, setSync] = useState<RoomSyncPayload | null>(null);
  const [connected, setConnected] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);

  const socket = useMemo(() => {
    if (!socketRef.current) {
      socketRef.current = connectSocket();
    }

    return socketRef.current;
  }, []);

  useEffect(() => {
    if (!enabled || !code) {
      return undefined;
    }

    const creds = loadSession(code);

    if (!creds) {
      setBindError("Missing session. Go back and enter your name again.");

      return undefined;
    }

    const handleSync = (payload: RoomSyncPayload) => {
      setSync(payload);
    };

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("room:sync", handleSync);

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit(
      "session:bind",
      {
        code: creds.code,
        playerId: creds.playerId,
        secret: creds.secret,
      },
      (ack?: { ok?: boolean; error?: string }) => {
        if (ack && ack.ok === false) {
          setBindError(ack.error ?? "Unable to reconnect.");
        } else {
          setBindError(null);
        }
      },
    );

    return () => {
      socket.off("room:sync", handleSync);
    };
  }, [code, enabled, socket]);

  const emitWithAck = useCallback(
    (event: string, payload?: unknown) =>
      new Promise<{ ok?: boolean; error?: string } | undefined>((resolve, reject) => {
        try {
          socket.emit(event, payload ?? {}, (ack?: { ok?: boolean; error?: string }) => {
            resolve(ack);
          });
        } catch (error) {
          reject(error);
        }
      }),
    [socket],
  );

  return {
    socket,
    sync,
    connected,
    bindError,
    emitWithAck,
  };
}
