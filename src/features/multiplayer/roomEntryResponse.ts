import { roomEntrySchema, type SessionCredentials } from "@/domain/multiplayer/sessionCredentials";

export type RoomEntrySession = SessionCredentials;
export async function readRoomEntrySession(
  response: Response,
  fallbackError: string,
): Promise<RoomEntrySession> {
  const payload: unknown = await response.json().catch(() => null);
  const parsed = roomEntrySchema.safeParse(payload);
  if (!response.ok || !parsed.success) {
    const error =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : fallbackError;
    throw new Error(error);
  }
  const { code, playerId, secret } = parsed.data;
  return { code, playerId, secret };
}
