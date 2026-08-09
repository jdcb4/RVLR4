import { describe, expect, it } from "vitest";

import { sessionBindSchema, socketSchemas } from "./socketSchemas.ts";

describe("Socket.IO boundary schemas", () => {
  it("accepts only undefined for payload-free events", () => {
    expect(socketSchemas["www:correct"].safeParse(undefined).success).toBe(true);
    expect(socketSchemas["www:correct"].safeParse({}).success).toBe(false);
  });

  it("normalizes names and rejects unknown fields", () => {
    expect(socketSchemas["lobby:setName"].parse({ name: "  Joe   Bloggs " })).toEqual({
      name: "Joe Bloggs",
    });
    expect(socketSchemas["lobby:setName"].safeParse({ name: "Joe", admin: true }).success).toBe(
      false,
    );
  });

  it.each([
    {},
    { patch: {} },
    { patch: { turnDurationSeconds: 31 } },
    { patch: { totalRounds: Number.POSITIVE_INFINITY } },
    { patch: { selectedCategories: [] } },
    { patch: { difficultyMode: "impossible" } },
    { patch: { teamCount: 2, unexpected: true } },
  ])("rejects invalid WWW settings patch %#", (payload) => {
    expect(socketSchemas["lobby:hostPatchWhoWhatWhereSettings"].safeParse(payload).success).toBe(
      false,
    );
  });

  it("accepts the current UI settings values", () => {
    expect(
      socketSchemas["lobby:hostPatchWhoWhatWhereSettings"].safeParse({
        patch: {
          teamCount: 4,
          turnDurationSeconds: 75,
          totalRounds: 4,
          skipLimit: -1,
          selectedCategories: ["Who", "What", "Where"],
          difficultyMode: "hard",
          hints: { enabled: true, perTurnLimit: 3 },
        },
      }).success,
    ).toBe(true);
  });

  it.each([
    ["lobby:hostPatchHatPrefs", {}],
    ["lobby:hostPatchHatPrefs", { hatTurnDurationSeconds: 90 }],
    ["lobby:hostPatchImposterCounts", { imposterImposterCount: 0 }],
    ["lobby:hostPatchDrawNGuessSettings", { drawingDurationMs: 61_000 }],
  ] as const)("rejects invalid %s payload", (event, payload) => {
    expect(socketSchemas[event].safeParse(payload).success).toBe(false);
  });

  it("requires normalized session identifiers and reconnect secrets", () => {
    const parsed = sessionBindSchema.parse({
      code: " abc234 ",
      playerId: "07672d0a-8ab8-4a0d-9dc2-dad2f0f3897e",
      secret: "a".repeat(32),
    });
    expect(parsed.code).toBe("ABC234");
    expect(sessionBindSchema.safeParse({ ...parsed, extra: true }).success).toBe(false);
    expect(sessionBindSchema.safeParse({ ...parsed, secret: "short" }).success).toBe(false);
  });
});
