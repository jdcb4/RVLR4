export type OperationalLogLevel = "info" | "warn" | "error";

export type OperationalLogFields = {
  readonly operation?: string;
  readonly errorClass?: string;
  readonly count?: number;
  readonly version?: string;
  readonly port?: number;
  readonly signal?: string;
};

export function operationalLog(
  level: OperationalLogLevel,
  event: string,
  fields: OperationalLogFields = {},
): void {
  const safeFields = {
    ...(fields.operation === undefined ? {} : { operation: fields.operation }),
    ...(fields.errorClass === undefined ? {} : { errorClass: fields.errorClass }),
    ...(fields.count === undefined ? {} : { count: fields.count }),
    ...(fields.version === undefined ? {} : { version: fields.version }),
    ...(fields.port === undefined ? {} : { port: fields.port }),
    ...(fields.signal === undefined ? {} : { signal: fields.signal }),
  };
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...safeFields,
  });

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export class RateLimitReporter {
  private readonly counts = new Map<string, number>();

  record(operation: string): void {
    this.counts.set(operation, (this.counts.get(operation) ?? 0) + 1);
  }

  flush(): void {
    for (const [operation, count] of this.counts) {
      operationalLog("warn", "rate_limit", { operation, count });
    }

    this.counts.clear();
  }
}

export function startRateLimitReporter(reporter: RateLimitReporter): NodeJS.Timeout {
  const timer = setInterval(() => reporter.flush(), 60_000);
  timer.unref();

  return timer;
}
