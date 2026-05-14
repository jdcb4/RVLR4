export type RoomEntrySession = {
  readonly code: string;
  readonly playerId: string;
  readonly secret: string;
};

type RoomEntryPayload = {
  readonly code?: string;
  readonly playerId?: string;
  readonly secret?: string;
  readonly error?: string;
};

export async function readRoomEntrySession(
  response: Response,
  fallbackError: string,
): Promise<RoomEntrySession> {
  const payload = (await response.json()) as RoomEntryPayload;

  if (!response.ok || !payload.code || !payload.playerId || !payload.secret) {
    throw new Error(payload.error ?? fallbackError);
  }

  return {
    code: payload.code,
    playerId: payload.playerId,
    secret: payload.secret,
  };
}
