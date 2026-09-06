import { describe, expect, it } from "vitest";

import { generateSecretToken, verifySecretToken } from "./secrets.ts";

describe("reconnect secrets", () => {
  it("generates 32-character base64url values", () => {
    expect(generateSecretToken()).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it("accepts an equal token", () => {
    const secret = generateSecretToken();
    expect(verifySecretToken(secret, secret)).toBe(true);
  });

  it.each(["", "short", "!".repeat(32), "a".repeat(31), "a".repeat(33)])(
    "rejects malformed or unequal-length candidate %j",
    (candidate) => {
      expect(verifySecretToken(generateSecretToken(), candidate)).toBe(false);
    },
  );

  it("rejects a valid-shaped but incorrect token", () => {
    expect(verifySecretToken("a".repeat(32), "b".repeat(32))).toBe(false);
  });
});
