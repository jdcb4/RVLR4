import { describe, expect, it } from "vitest";

import { loadServerEnv } from "./env.ts";

describe("loadServerEnv", () => {
  it("defaults NODE_ENV to development and accepts no CLIENT_ORIGIN", () => {
    const env = loadServerEnv({});

    expect(env.NODE_ENV).toBe("development");
    expect(env.CLIENT_ORIGIN).toBeUndefined();
    expect(env.PORT).toBe(3001);
    expect(env.MULTIPLAYER_DEBUG).toBe(false);
  });

  it("accepts an explicit CLIENT_ORIGIN in production", () => {
    const env = loadServerEnv({
      NODE_ENV: "production",
      CLIENT_ORIGIN: "https://app.example.com,https://www.example.com",
    });

    expect(env.NODE_ENV).toBe("production");
    expect(env.CLIENT_ORIGIN).toBe(
      "https://app.example.com,https://www.example.com",
    );
  });

  it("refuses to load in production when CLIENT_ORIGIN is missing", () => {
    expect(() =>
      loadServerEnv({
        NODE_ENV: "production",
      }),
    ).toThrow(/CLIENT_ORIGIN/);
  });

  it("refuses to load in production when CLIENT_ORIGIN is empty/whitespace", () => {
    expect(() =>
      loadServerEnv({
        NODE_ENV: "production",
        CLIENT_ORIGIN: "   ,  ",
      }),
    ).toThrow(/CLIENT_ORIGIN/);
  });

  it("coerces MULTIPLAYER_DEBUG from '1' and 'true'", () => {
    expect(loadServerEnv({ MULTIPLAYER_DEBUG: "1" }).MULTIPLAYER_DEBUG).toBe(true);
    expect(loadServerEnv({ MULTIPLAYER_DEBUG: "true" }).MULTIPLAYER_DEBUG).toBe(
      true,
    );
    expect(loadServerEnv({ MULTIPLAYER_DEBUG: "0" }).MULTIPLAYER_DEBUG).toBe(
      false,
    );
  });
});
