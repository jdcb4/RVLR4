import { afterEach, expect, it, vi } from "vitest";

import { initMultiplayerDebug, mpDebug } from "./multiplayerDebug.ts";

afterEach(() => {
  initMultiplayerDebug(false);
  vi.restoreAllMocks();
});

it("keeps debug logging opt-in and strips private metadata when enabled", () => {
  const write = vi.spyOn(console, "log").mockImplementation(() => undefined);
  mpDebug("player joined", { playerCount: 3 });
  expect(write).not.toHaveBeenCalled();
  initMultiplayerDebug(true);
  mpDebug("player joined", {
    gameKind: "hat",
    playerCount: 3,
    code: "PRIVATE-CODE",
    playerId: "PRIVATE-PLAYER",
    secret: "PRIVATE-SECRET",
  } as never);
  const output = JSON.stringify(write.mock.calls);
  expect(output).toContain('"playerCount":3');
  expect(output).toContain('"gameKind":"hat"');
  expect(output).not.toContain("PRIVATE-");
});
