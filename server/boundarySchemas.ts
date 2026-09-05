import { z } from "zod";

import { roomCodeSchema } from "@/domain/multiplayer/sessionCredentials";
import { AVATAR_IDS } from "@/multiplayer/avatarCatalog";

const normalizedName = z
  .string()
  .transform((value) => value.trim().replace(/\s+/g, " "))
  .pipe(z.string().min(1).max(32));

export { roomCodeSchema } from "@/domain/multiplayer/sessionCredentials";

const avatarSchema = z.enum(AVATAR_IDS);

export const createRoomBodySchema = z
  .object({
    gameKind: z.enum(["whowhatwhere", "hat", "imposter", "drawnguess"]),
    hostName: normalizedName,
    avatarId: avatarSchema.optional(),
  })
  .strict();

export const roomParamsSchema = z.object({ code: roomCodeSchema }).strict();

export const joinRoomBodySchema = z
  .object({
    name: normalizedName,
    avatarId: avatarSchema.optional(),
  })
  .strict();
