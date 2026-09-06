import { randomBytes, timingSafeEqual } from "node:crypto";

const SECRET_PATTERN = /^[A-Za-z0-9_-]{32}$/;

/** Opaque reconnect token stored client-side (sessionStorage). */
export function generateSecretToken(): string {
  return randomBytes(24).toString("base64url");
}

export function verifySecretToken(expected: string, candidate: string): boolean {
  if (!SECRET_PATTERN.test(expected) || !SECRET_PATTERN.test(candidate)) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, "base64url");
  const candidateBuffer = Buffer.from(candidate, "base64url");

  return (
    expectedBuffer.length === candidateBuffer.length &&
    timingSafeEqual(expectedBuffer, candidateBuffer)
  );
}
