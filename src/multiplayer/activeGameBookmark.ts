import { z } from "zod";

import { gameKindSchema, roomCodeSchema } from "@/domain/multiplayer/sessionCredentials";
import { localGameStorage, readValidatedRecord } from "@/services/browserStorage";

const STORAGE_KEY = "jd-multiplayer-active-game";
const bookmarkSchema = z.object({
  code: roomCodeSchema,
  gameKind: gameKindSchema,
  startedAtIso: z.string().datetime({ offset: true }),
});
export type ActiveGameBookmark = z.infer<typeof bookmarkSchema>;
export function writeActiveGameBookmark(entry: ActiveGameBookmark): void {
  localGameStorage.write(STORAGE_KEY, JSON.stringify(entry));
}
export function readActiveGameBookmark(): ActiveGameBookmark | null {
  return readValidatedRecord(STORAGE_KEY, bookmarkSchema);
}
export function clearActiveGameBookmark(): void {
  localGameStorage.remove(STORAGE_KEY);
}
