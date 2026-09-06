// @vitest-environment node

import http from "node:http";
import type { AddressInfo } from "node:net";

import express from "express";
import { afterEach, describe, expect, it } from "vitest";

import { type HealthState, registerHealthRoute } from "./health.ts";

describe("GET /api/health", () => {
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

  it("reports readiness and shutdown without caching", async () => {
    const app = express();
    const state: HealthState = { shuttingDown: false };
    registerHealthRoute(app, state, "1.2.3");
    server = http.createServer(app);
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as AddressInfo).port;
    const url = `http://127.0.0.1:${port}/api/health`;

    const ready = await fetch(url);
    expect(ready.status).toBe(200);
    expect(ready.headers.get("cache-control")).toBe("no-store");
    expect(await ready.json()).toEqual({ status: "ok", version: "1.2.3" });

    state.shuttingDown = true;
    const stopping = await fetch(url);
    expect(stopping.status).toBe(503);
    expect(await stopping.json()).toEqual({ status: "shutting-down", version: "1.2.3" });
  });
});
