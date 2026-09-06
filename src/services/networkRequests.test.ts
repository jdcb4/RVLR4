import { afterEach, describe, expect, it, vi } from "vitest";

import { requestHttp } from "./networkRequests";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("HTTP request deadlines", () => {
  it.each(["headers", "body"])(
    "bounds a request stalled at %s and aborts the transport",
    async (stage) => {
      vi.useFakeTimers();
      let signal: AbortSignal | undefined;
      vi.stubGlobal(
        "fetch",
        vi.fn((_url: string, init: RequestInit) => {
          signal = init.signal ?? undefined;
          return stage === "headers"
            ? new Promise<Response>(() => {})
            : Promise.resolve(new Response("{}"));
        }),
      );
      const result = requestHttp("/api/rooms", () => new Promise<unknown>(() => {}), {}, 100);
      const rejected = expect(result).rejects.toThrow("timed out");
      await vi.advanceTimersByTimeAsync(100);
      await rejected;
      expect(signal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("cancels a request when its screen leaves and cleans up the deadline", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );
    const controller = new AbortController();
    const result = requestHttp("/api/rooms", (response) => response.json(), {
      signal: controller.signal,
    });
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("returns parsed data and removes the timeout on success", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('{"exists":true}')),
    );
    await expect(requestHttp("/api/rooms", (response) => response.json())).resolves.toEqual({
      exists: true,
    });
    expect(vi.getTimerCount()).toBe(0);
  });
});
