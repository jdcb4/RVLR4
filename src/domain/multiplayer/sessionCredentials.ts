import { z } from "zod";

export const roomCodeSchema = z
  .string()
  .transform((value) => value.trim().toUpperCase())
  .pipe(z.string().regex(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/));
export const gameKindSchema = z.enum(["whowhatwhere", "hat", "imposter", "drawnguess"]);
export const sessionCredentialsSchema = z
  .object({
    code: roomCodeSchema,
    playerId: z.string().uuid(),
    secret: z.string().regex(/^[A-Za-z0-9_-]{32}$/),
  })
  .strict();
export type SessionCredentials = z.infer<typeof sessionCredentialsSchema>;
export const roomEntrySchema = sessionCredentialsSchema.extend({ gameKind: gameKindSchema });
