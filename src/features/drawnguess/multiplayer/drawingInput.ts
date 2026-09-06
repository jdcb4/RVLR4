import {
  DRAWNGUESS_MAX_POINTS_PER_STROKE,
  DRAWNGUESS_MAX_SERIALIZED_DRAWING_BYTES,
  DRAWNGUESS_MAX_STROKES,
  DRAWNGUESS_MAX_TOTAL_POINTS,
  type DrawNGuessDrawing,
  type DrawNGuessPoint,
  type DrawNGuessStroke,
} from "@/domain/drawnguess/types";

export function drawingInputBudget(drawing: DrawNGuessDrawing) {
  if (drawing.format !== "strokes-v1") return { strokes: 0, points: 0, bytes: 0 };
  return {
    strokes: DRAWNGUESS_MAX_STROKES - drawing.strokes.length,
    points: Math.min(
      DRAWNGUESS_MAX_POINTS_PER_STROKE,
      DRAWNGUESS_MAX_TOTAL_POINTS -
        drawing.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0),
    ),
    // Adding an item replaces no existing bytes; only a comma is needed after a prior stroke.
    bytes:
      DRAWNGUESS_MAX_SERIALIZED_DRAWING_BYTES -
      new TextEncoder().encode(JSON.stringify(drawing)).byteLength -
      (drawing.strokes.length ? 1 : 0),
  };
}

export function strokeFitsBudget(
  stroke: DrawNGuessStroke,
  budget: ReturnType<typeof drawingInputBudget>,
) {
  return (
    budget.strokes > 0 &&
    stroke.points.length <= budget.points &&
    new TextEncoder().encode(JSON.stringify(stroke)).byteLength <= budget.bytes
  );
}

/** At most 0.32px coordinate error on the 640px canvas; removes long float strings. */
export function quantizeDrawingPoint(point: DrawNGuessPoint): DrawNGuessPoint {
  const coordinate = (value: number) =>
    Number.isFinite(value) ? Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000 : 0;
  return { x: coordinate(point.x), y: coordinate(point.y) };
}
