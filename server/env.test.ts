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

  it("loads in production without CLIENT_ORIGIN (warning printed at boot, not a parse error)", () => {
    // Railway / similar platforms don't know their public origin at container
    // start; we warn instead of fail-fast — see server/index.ts for the warn.
    const env = loadServerEnv({ NODE_ENV: "production" });

    expect(env.NODE_ENV).toBe("production");
    expect(env.CLIENT_ORIGIN).toBeUndefined();
  });

  it("loads in production with an empty/whitespace CLIENT_ORIGIN", () => {
    const env = loadServerEnv({
      NODE_ENV: "production",
      CLIENT_ORIGIN: "   ,  ",
    });

    expect(env.NODE_ENV).toBe("production");
    expect(env.CLIENT_ORIGIN).toBe("   ,  ");
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
