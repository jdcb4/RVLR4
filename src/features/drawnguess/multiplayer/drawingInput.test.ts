import { describe, expect, it } from "vitest";

import type { DrawNGuessDrawing, DrawNGuessStroke } from "@/domain/drawnguess/types";
import { socketSchemas } from "@/domain/multiplayer/socketSchemas";

import { drawingInputBudget, quantizeDrawingPoint, strokeFitsBudget } from "./drawingInput";

const stroke: DrawNGuessStroke = {
  id: "stroke",
  color: "#111827",
  size: 4,
  tool: "pen",
  points: [{ x: 0.5, y: 0.2 }],
};
const blank: DrawNGuessDrawing = { format: "strokes-v1", width: 1, height: 1, strokes: [] };

describe("drawing input limits", () => {
  it("keeps coordinates within 0.32px on the canvas while cutting long float strings", () => {
    const point = { x: 0.1234567890123, y: 0.8765432109876 };
    const compact = quantizeDrawingPoint(point);
    expect(Math.abs(point.x - compact.x) * 640).toBeLessThanOrEqual(0.32);
    expect(Math.abs(point.y - compact.y) * 480).toBeLessThanOrEqual(0.24);
    expect(JSON.stringify(compact).length).toBeLessThan(JSON.stringify(point).length);
    expect(quantizeDrawingPoint({ x: NaN, y: 2 })).toEqual({ x: 0, y: 1 });
  });

  it("permits the final valid stroke and stops at stroke, point, and byte limits", () => {
    const denseStroke = {
      ...stroke,
      points: Array.from({ length: 2000 }, () => stroke.points[0]!),
    };
    const drawing = { ...blank, strokes: [denseStroke, denseStroke] };
    expect(strokeFitsBudget(denseStroke, drawingInputBudget(drawing))).toBe(true);
    const full = { ...drawing, strokes: [...drawing.strokes, denseStroke] };
    expect(socketSchemas["drawnguess:submitDrawing"].safeParse({ drawing: full }).success).toBe(
      true,
    );
    expect(strokeFitsBudget(stroke, drawingInputBudget(full))).toBe(false);
    expect(
      strokeFitsBudget(stroke, drawingInputBudget({ ...blank, strokes: Array(200).fill(stroke) })),
    ).toBe(false);
    expect(
      strokeFitsBudget(
        { ...denseStroke, points: [...denseStroke.points, stroke.points[0]!] },
        drawingInputBudget(blank),
      ),
    ).toBe(false);
    const bytes = new TextEncoder().encode(JSON.stringify(stroke)).byteLength;
    expect(strokeFitsBudget(stroke, { strokes: 1, points: 1, bytes })).toBe(true);
    expect(strokeFitsBudget(stroke, { strokes: 1, points: 1, bytes: bytes - 1 })).toBe(false);
  });
});
