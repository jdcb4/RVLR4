import { afterEach, describe, expect, it, vi } from "vitest";

import { clearSession, loadSession, persistSession } from "@/multiplayer/useRoomChannel";

import { createBrowserStorage, getStorageNotice } from "./browserStorage";

const creds = {
  code: "ZZZ234",
  playerId: "07672d0a-8ab8-4a0d-9dc2-dad2f0f3897e",
  secret: "a".repeat(32),
};
afterEach(() => {
  vi.restoreAllMocks();
  clearSession(creds.code);
});

describe("browser storage failures", () => {
  it("keeps failed writes in memory and never resurrects a failed removal", () => {
    const storage = createBrowserStorage("localStorage");
    expect(storage.write("storage-probe", "old")).toBe(true);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    expect(storage.write("storage-probe", "new")).toBe(false);
    expect(storage.read("storage-probe")).toBe("new");
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("Denied", "SecurityError");
    });
    expect(storage.remove("storage-probe")).toBe(false);
    expect(storage.read("storage-probe")).toBeNull();
    expect(getStorageNotice()).toContain("refreshing or closing");
  });

  it("contains access to a blocked storage property and restores writes when it recovers", () => {
    const storage = createBrowserStorage("localStorage");
    const access = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Denied", "SecurityError");
    });
    expect(storage.read("denied")).toBeNull();
    expect(storage.write("denied", "kept here")).toBe(false);
    expect(storage.read("denied")).toBe("kept here");
    access.mockRestore();
    expect(storage.write("denied", "persisted again")).toBe(true);
    expect(localStorage.getItem("denied")).toBe("persisted again");
    expect(storage.remove("denied")).toBe(true);
  });

  it("can bind using in-memory credentials when session storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(persistSession(creds)).toBe(false);
    expect(loadSession(creds.code)).toEqual(creds);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => clearSession(creds.code)).not.toThrow();
    expect(loadSession(creds.code)).toBeNull();
  });

  it("rejects a malformed or mismatched saved identity", () => {
    sessionStorage.setItem(
      `jd-multiplayer:${creds.code}`,
      JSON.stringify({ ...creds, code: "ABC234" }),
    );
    expect(loadSession(creds.code)).toBeNull();
    sessionStorage.setItem(
      `jd-multiplayer:${creds.code}`,
      JSON.stringify({ ...creds, secret: [] }),
    );
    expect(loadSession(creds.code)).toBeNull();
  });
});
