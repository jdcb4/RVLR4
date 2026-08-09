import { describe, expect, it } from "vitest";

import { TokenBucketStore } from "./rateLimiter.ts";

const policy = { capacity: 2, refillTokensPerMs: 1 / 1_000 };

describe("TokenBucketStore", () => {
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
});
