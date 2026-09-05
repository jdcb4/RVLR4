import { describe, expect, it } from "vitest";

import { loadServerEnv } from "./env.ts";

describe("loadServerEnv", () => {
  it.each(["0", "65536", "not-a-port"])("rejects an unusable PORT %s", (PORT) => {
    expect(() => loadServerEnv({ PORT })).toThrow();
  });
  it("defaults NODE_ENV to development and accepts no CLIENT_ORIGIN", () => {
    const env = loadServerEnv({});

    expect(env.NODE_ENV).toBe("development");
    expect(env.CLIENT_ORIGIN).toBeUndefined();
    expect(env.CLIENT_ORIGINS).toEqual([]);
    expect(env.PORT).toBe(3001);
    expect(env.MULTIPLAYER_DEBUG).toBe(false);
  });

  it("accepts an explicit CLIENT_ORIGIN in production", () => {
    const env = loadServerEnv({
      NODE_ENV: "production",
      CLIENT_ORIGIN: "https://app.example.com,https://www.example.com",
    });

    expect(env.NODE_ENV).toBe("production");
    expect(env.CLIENT_ORIGIN).toBe("https://app.example.com,https://www.example.com");
    expect(env.CLIENT_ORIGINS).toEqual(["https://app.example.com", "https://www.example.com"]);
  });

  it("fails closed in production without CLIENT_ORIGIN", () => {
    expect(() => loadServerEnv({ NODE_ENV: "production" })).toThrow(/CLIENT_ORIGIN/);
  });

  it("rejects empty or invalid origins in production", () => {
    expect(() => loadServerEnv({ NODE_ENV: "production", CLIENT_ORIGIN: "   ,  " })).toThrow(
      /CLIENT_ORIGIN/,
    );

    expect(() =>
      loadServerEnv({ NODE_ENV: "production", CLIENT_ORIGIN: "https://example.com/path" }),
    ).toThrow(/invalid origin/);
  });

  it("coerces MULTIPLAYER_DEBUG from '1' and 'true'", () => {
    expect(loadServerEnv({ MULTIPLAYER_DEBUG: "1" }).MULTIPLAYER_DEBUG).toBe(true);
    expect(loadServerEnv({ MULTIPLAYER_DEBUG: "true" }).MULTIPLAYER_DEBUG).toBe(true);
    expect(loadServerEnv({ MULTIPLAYER_DEBUG: "0" }).MULTIPLAYER_DEBUG).toBe(false);
  });
});
