import { z } from "zod";

/**
 * Server-side environment (Node). Validated at startup so misconfiguration
 * fails fast on shape errors (bad PORT, unknown NODE_ENV).
 *
 * Production requires at least one validated browser origin so CORS and
 * Socket.IO fail closed rather than silently accepting arbitrary websites.
 */
const ServerEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().max(65535).default(3001),
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
  .transform((environment, context) => {
    const origins: string[] = [];

    for (const rawOrigin of environment.CLIENT_ORIGIN?.split(",") ?? []) {
      const candidate = rawOrigin.trim();

      if (!candidate) {
        continue;
      }

      try {
        const parsed = new URL(candidate);
        const normalizedCandidate = candidate.endsWith("/") ? candidate.slice(0, -1) : candidate;

        if (
          (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
          parsed.username ||
          parsed.password ||
          parsed.origin !== normalizedCandidate
        ) {
          throw new Error("not an HTTP origin");
        }

        origins.push(parsed.origin);
      } catch {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CLIENT_ORIGIN"],
          message: `CLIENT_ORIGIN contains an invalid origin: ${candidate}`,
        });
      }
    }

    if (environment.NODE_ENV === "production" && origins.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CLIENT_ORIGIN"],
        message: "CLIENT_ORIGIN must contain at least one HTTP(S) origin in production.",
      });
    }

    return { ...environment, CLIENT_ORIGINS: [...new Set(origins)] };
  });

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function loadServerEnv(processEnv: NodeJS.ProcessEnv): ServerEnv {
  return ServerEnvSchema.parse(processEnv);
}
