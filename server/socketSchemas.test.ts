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
    expect(socketSchemas["lobby:hostSetTeamCount"].parse({ teamCount: 2 })).toEqual({
      teamCount: 2,
    });
  });

  it("strips undefined patch fields and rejects patches with no defined setting", () => {
    expect(
      socketSchemas["lobby:hostPatchWhoWhatWhereSettings"].parse({
        patch: { turnDurationSeconds: 45, teamCount: undefined },
      }),
    ).toEqual({ patch: { turnDurationSeconds: 45 } });
    expect(
      socketSchemas["lobby:hostPatchHatPrefs"].parse({
        hatTurnDurationSeconds: 60,
        hatSkipsPerTurn: undefined,
      }),
    ).toEqual({ hatTurnDurationSeconds: 60 });
    expect(
      socketSchemas["lobby:hostPatchHatPrefs"].safeParse({ hatSkipsPerTurn: undefined }).success,
    ).toBe(false);
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

  it("rejects drawings over aggregate point and byte budgets", () => {
    const baseStroke = {
      id: "stroke",
      color: "#111827",
      size: 6,
      tool: "pen" as const,
    };
    const tooManyPoints = {
      drawing: {
        format: "strokes-v1",
        width: 512,
        height: 512,
        strokes: Array.from({ length: 4 }, (_, index) => ({
          ...baseStroke,
          id: `stroke-${index}`,
          points: Array.from({ length: 1_501 }, () => ({ x: 0.5, y: 0.5 })),
        })),
      },
    };
    expect(socketSchemas["drawnguess:submitDrawing"].safeParse(tooManyPoints).success).toBe(false);

    const tooManyBytes = {
      drawing: {
        format: "strokes-v1",
        width: 512,
        height: 512,
        strokes: Array.from({ length: 100 }, (_, index) => ({
          ...baseStroke,
          id: `stroke-${index}`,
          points: Array.from({ length: 60 }, () => ({ x: 0.123456789, y: 0.987654321 })),
        })),
      },
    };
    expect(socketSchemas["drawnguess:submitDrawing"].safeParse(tooManyBytes).success).toBe(false);
  });
});
