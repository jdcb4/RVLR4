import { describe, expect, it, vi } from "vitest";

import { createCorsOriginValidator, isBrowserOriginAllowed } from "./originPolicy.ts";

describe("browser origin policy", () => {
  const allowed = ["https://dev.example.com", "https://app.example.com"];

  it("allows absent origins and exact allow-list matches", () => {
    expect(isBrowserOriginAllowed(undefined, allowed)).toBe(true);
    expect(isBrowserOriginAllowed("https://dev.example.com", allowed)).toBe(true);
  });

  it("rejects subdomains, paths, and unlisted origins", () => {
    expect(isBrowserOriginAllowed("https://evil.dev.example.com", allowed)).toBe(false);
    expect(isBrowserOriginAllowed("https://dev.example.com/path", allowed)).toBe(false);
    expect(isBrowserOriginAllowed("https://evil.example.com", allowed)).toBe(false);
  });

  it("returns an error through the CORS callback for a denied origin", () => {
    const callback = vi.fn();
    const validator = createCorsOriginValidator(allowed);
    expect(typeof validator).toBe("function");
    validator("https://evil.example.com", callback);
    expect(callback).toHaveBeenCalledWith(expect.any(Error));
  });
});
