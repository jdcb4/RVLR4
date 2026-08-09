// @vitest-environment node

import http from "node:http";
import type { AddressInfo } from "node:net";

import express from "express";
import { afterEach, describe, expect, it } from "vitest";

import { securityHeaders } from "./securityHeaders.ts";

describe("security headers", () => {
  let server: http.Server | undefined;

  afterEach(
    () =>
      new Promise<void>((resolve) => {
        if (!server) {
          resolve();
          return;
        }
        server.close(() => resolve());
      }),
  );

  it("sets the reviewed Helmet baseline and hides Express", async () => {
    const app = express();
    app.disable("x-powered-by");
    app.use(securityHeaders);
    app.get("/", (_request, response) => response.send("ok"));
    server = http.createServer(app);
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as AddressInfo).port;
    const response = await fetch(`http://127.0.0.1:${port}/`);
    const csp = response.headers.get("content-security-policy") ?? "";

    expect(response.headers.get("x-powered-by")).toBeNull();
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self' ws: wss:");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
