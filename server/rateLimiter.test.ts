import { afterEach, describe, expect, it, vi } from "vitest";

import { startRateLimiterSweeper, TokenBucketStore } from "./rateLimiter.ts";

const policy = { capacity: 2, refillTokensPerMs: 1 / 1_000 };

describe("TokenBucketStore", () => {
  afterEach(() => vi.useRealTimers());
  it("isolates keys, rejects excess work, and refills with an injected clock", () => {
    let now = 0;
    const store = new TokenBucketStore(() => now);

    expect(store.take("a", policy).allowed).toBe(true);
    expect(store.take("a", policy).allowed).toBe(true);
    expect(store.take("a", policy)).toEqual({ allowed: false, retryAfterMs: 1_000 });
    expect(store.take("b", policy).allowed).toBe(true);

    now = 500;
    expect(store.take("a", policy)).toEqual({ allowed: false, retryAfterMs: 500 });
    now = 1_000;
    expect(store.take("a", policy).allowed).toBe(true);
  });

  it("charges variable costs", () => {
    const store = new TokenBucketStore(() => 0);
    expect(store.take("drawing", { ...policy, capacity: 4 }, 3).allowed).toBe(true);
    expect(store.take("drawing", { ...policy, capacity: 4 }, 2).allowed).toBe(false);
  });

  it("sweeps idle keys and remains bounded", () => {
    let now = 0;
    const store = new TokenBucketStore(() => now, 2, 100);
    store.take("a", policy);
    store.take("b", policy);
    store.take("c", policy);
    expect(store.size).toBe(2);

    now = 101;
    expect(store.sweep()).toBe(2);
    expect(store.size).toBe(0);
  });

  it("reclaims idle keys before evicting a live bucket at capacity", () => {
    let now = 0;
    const store = new TokenBucketStore(() => now, 2, 100);
    store.take("stale-a", policy);
    store.take("stale-b", policy);

    now = 101;
    expect(store.take("fresh", policy).allowed).toBe(true);
    expect(store.size).toBe(1);
  });

  it("runs idle cleanup from the unref'd sweep timer", () => {
    vi.useFakeTimers();
    let now = 0;
    const store = new TokenBucketStore(() => now, 2, 100);
    store.take("a", policy);
    startRateLimiterSweeper(store);
    now = 61_000;
    vi.advanceTimersByTime(60_000);
    expect(store.size).toBe(0);
  });
});
