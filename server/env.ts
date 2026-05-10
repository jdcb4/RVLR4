import { z } from "zod";

/**
 * Server-side environment (Node). Validated at startup so misconfiguration fails fast.
 */
const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  /** Allowed browser origins for CORS + Socket.IO (comma-separated). */
  CLIENT_ORIGIN: z.string().optional(),
  /**
   * When true, emit `[multiplayer]` console lines for room lifecycle (no secrets).
   * Set `MULTIPLAYER_DEBUG=1` or `true`.
   */
  MULTIPLAYER_DEBUG: z
    .string()
    .optional()
    .transform((value) => value === "1" || value?.toLowerCase() === "true"),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function loadServerEnv(processEnv: NodeJS.ProcessEnv): ServerEnv {
  return ServerEnvSchema.parse(processEnv);
}
