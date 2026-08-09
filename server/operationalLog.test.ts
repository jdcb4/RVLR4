import { afterEach, describe, expect, it, vi } from "vitest";

import { operationalLog, RateLimitReporter } from "./operationalLog.ts";

describe("operational logging", () => {
  afterEach(() => vi.restoreAllMocks());

  it("emits structured allow-listed metadata and redacts arbitrary content", () => {
    const write = vi.spyOn(console, "error").mockImplementation(() => undefined);
    operationalLog("error", "socket_error", {
      operation: "socket.dispatch",
      errorClass: "TypeError",
      secret: "session-secret",
      roomCode: "ABC234",
      clue: "private clue",
    } as never);

    const line = String(write.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toMatchObject({
      level: "error",
      event: "socket_error",
      operation: "socket.dispatch",
      errorClass: "TypeError",
    });
    expect(line).not.toContain("session-secret");
    expect(line).not.toContain("ABC234");
    expect(line).not.toContain("private clue");
  });

  it("aggregates rate-limit events by operation", () => {
    const write = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const reporter = new RateLimitReporter();
    reporter.record("http.create");
    reporter.record("http.create");
    reporter.flush();
    expect(JSON.parse(String(write.mock.calls[0]?.[0]))).toMatchObject({
      event: "rate_limit",
      operation: "http.create",
      count: 2,
    });
  });
});
