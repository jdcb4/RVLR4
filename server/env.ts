import { z } from "zod";

/**
 * Server-side environment (Node). Validated at startup so misconfiguration fails fast.
 *
 * In production, `CLIENT_ORIGIN` is **required** — there is no implicit
 * allow-any fallback. See `docs/DEPLOYMENT.md`.
 */
const ServerEnvSchema = z
  .object({
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
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") {
      return;
    }

    const origins = env.CLIENT_ORIGIN?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (!origins || origins.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CLIENT_ORIGIN"],
        message:
          "CLIENT_ORIGIN must be set in production (comma-separated list of allowed browser origins).",
      });
    }
  });

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function loadServerEnv(processEnv: NodeJS.ProcessEnv): ServerEnv {
  return ServerEnvSchema.parse(processEnv);
}
