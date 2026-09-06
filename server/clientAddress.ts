import { isIP } from "node:net";

import type { Request } from "express";
import type { Socket } from "socket.io";

function railwayAddress(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  const candidate = value?.trim();

  return candidate && isIP(candidate) ? candidate : null;
}

export function httpClientAddress(
  request: { headers: Request["headers"]; socket: Pick<Request["socket"], "remoteAddress"> },
  isRailway: boolean,
): string {
  if (isRailway) {
    const trusted = railwayAddress(request.headers["x-real-ip"]);

    if (trusted) {
      return trusted;
    }
  }

  return request.socket.remoteAddress ?? "unknown";
}

export function socketClientAddress(
  socket: { handshake: Pick<Socket["handshake"], "headers" | "address"> },
  isRailway: boolean,
): string {
  if (isRailway) {
    const trusted = railwayAddress(socket.handshake.headers["x-real-ip"]);

    if (trusted) {
      return trusted;
    }
  }

  return socket.handshake.address || "unknown";
}
