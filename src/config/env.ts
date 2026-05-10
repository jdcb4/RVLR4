import { z } from "zod";

const EnvSchema = z.object({
  MODE: z.enum(["development", "production", "test", "github-pages"]),
  BASE_URL: z.string(),
});

export const env = EnvSchema.parse({
  MODE: import.meta.env.MODE,
  BASE_URL: import.meta.env.BASE_URL,
});
