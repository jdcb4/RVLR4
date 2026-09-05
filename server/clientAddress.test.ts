import { describe, expect, it } from "vitest";

import { httpClientAddress, socketClientAddress } from "./clientAddress.ts";

describe("client address trust", () => {
  it("uses X-Real-IP only in Railway and only when it is a valid address", () => {
    const request = {
      headers: { "x-real-ip": "203.0.113.10" },
      socket: { remoteAddress: "127.0.0.1" },
    };

    expect(httpClientAddress(request, true)).toBe("203.0.113.10");
    expect(httpClientAddress(request, false)).toBe("127.0.0.1");
    request.headers["x-real-ip"] = "spoofed";
    expect(httpClientAddress(request, true)).toBe("127.0.0.1");
  });

  it("applies the same trust rule to Socket.IO handshakes", () => {
    const socket = {
      handshake: { headers: { "x-real-ip": "2001:db8::1" }, address: "127.0.0.1" },
    };

    expect(socketClientAddress(socket, true)).toBe("2001:db8::1");
    expect(socketClientAddress(socket, false)).toBe("127.0.0.1");
  });
});
