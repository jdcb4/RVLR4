export type TokenBucketPolicy = {
  readonly capacity: number;
  readonly refillTokensPerMs: number;
};

export type TokenBucketResult =
  | { readonly allowed: true; readonly remaining: number }
  | { readonly allowed: false; readonly retryAfterMs: number };

type Bucket = {
  tokens: number;
  updatedAt: number;
  lastSeenAt: number;
};

const RATE_LIMITER_MAX_KEYS = 5_000;
const RATE_LIMITER_IDLE_TTL_MS = 15 * 60_000;
const RATE_LIMITER_SWEEP_INTERVAL_MS = 60_000;

export const RATE_POLICIES = {
  createRoom: { capacity: 6, refillTokensPerMs: 1 / 60_000 },
  roomLookup: { capacity: 60, refillTokensPerMs: 1 / 1_000 },
  joinRoom: { capacity: 40, refillTokensPerMs: 1 / 1_000 },
  socketConnect: { capacity: 60, refillTokensPerMs: 1 / 1_000 },
  sessionBind: { capacity: 5, refillTokensPerMs: 1 / 12_000 },
  generalMutation: { capacity: 30, refillTokensPerMs: 15 / 1_000 },
  drawingMutation: { capacity: 20, refillTokensPerMs: 5 / 1_000 },
} satisfies Record<string, TokenBucketPolicy>;

export class TokenBucketStore {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly maxKeys = RATE_LIMITER_MAX_KEYS,
    private readonly idleTtlMs = RATE_LIMITER_IDLE_TTL_MS,
  ) {}

  take(key: string, policy: TokenBucketPolicy, cost = 1): TokenBucketResult {
    const now = this.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      this.makeCapacity(now);
      bucket = { tokens: policy.capacity, updatedAt: now, lastSeenAt: now };
      this.buckets.set(key, bucket);
    }

    const elapsed = Math.max(0, now - bucket.updatedAt);
    bucket.tokens = Math.min(policy.capacity, bucket.tokens + elapsed * policy.refillTokensPerMs);
    bucket.updatedAt = now;
    bucket.lastSeenAt = now;

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;

      return { allowed: true, remaining: bucket.tokens };
    }

    const missing = cost - bucket.tokens;

    return {
      allowed: false,
      retryAfterMs: Math.ceil(missing / policy.refillTokensPerMs),
    };
  }

  sweep(): number {
    const cutoff = this.now() - this.idleTtlMs;
    let removed = 0;

    for (const [key, bucket] of this.buckets) {
      if (bucket.lastSeenAt <= cutoff) {
        this.buckets.delete(key);
        removed += 1;
      }
    }

    return removed;
  }

  get size(): number {
    return this.buckets.size;
  }

  private makeCapacity(now: number): void {
    if (this.buckets.size < this.maxKeys) {
      return;
    }

    this.sweep();

    if (this.buckets.size < this.maxKeys) {
      return;
    }

    let oldestKey: string | undefined;
    let oldestSeenAt = now;

    for (const [key, bucket] of this.buckets) {
      if (bucket.lastSeenAt <= oldestSeenAt) {
        oldestSeenAt = bucket.lastSeenAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.buckets.delete(oldestKey);
    }
  }
}

export function startRateLimiterSweeper(store: TokenBucketStore): NodeJS.Timeout {
  const timer = setInterval(() => store.sweep(), RATE_LIMITER_SWEEP_INTERVAL_MS);
  timer.unref();

  return timer;
}
