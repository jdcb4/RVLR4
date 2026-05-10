import { randomBytes } from "node:crypto";

/** Opaque reconnect token stored client-side (sessionStorage). */
export function generateSecretToken(): string {
  return randomBytes(24).toString("base64url");
}
