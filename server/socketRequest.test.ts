// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { readSocketRequest, reportSocketFailure } from "./socketRequest.ts";

afterEach(() => vi.restoreAllMocks());

describe("socket argument boundary", () => {
  it.each([42, null, {}, [], "callback"])("rejects a non-function second argument: %j", (value) => {
    const request = readSocketRequest([{ ready: true }, value], "lobby:setReady");
    expect(request.valid).toBe(false);
    expect(() => request.ack({ ok: false })).not.toThrow();
  });

  it("supports callback-only events and rejects extra payloads even with a real callback", () => {
    const callback = vi.fn();
    const request = readSocketRequest([callback], "lobby:startGame");
    expect(request.valid).toBe(true);
    expect(request.payload).toBeUndefined();
    request.ack({ ok: true });
    expect(callback).toHaveBeenCalledWith({ ok: true });
    expect(readSocketRequest([{}, 42, callback], "session:bind").valid).toBe(false);
  });

  it("contains acknowledgement failures and records error classes without private content", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const request = readSocketRequest(
      [
        () => {
          throw new Error("private");
        },
      ],
      "test",
    );
    expect(() => request.ack({ ok: true })).not.toThrow();
    reportSocketFailure("test", new TypeError("private"));
    reportSocketFailure("test", new Error("private"));
    reportSocketFailure("test", { secret: "private" });
    expect(log).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify([log.mock.calls, warn.mock.calls])).not.toContain("private");
  });
});
