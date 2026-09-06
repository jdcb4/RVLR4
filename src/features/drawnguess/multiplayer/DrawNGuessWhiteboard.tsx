import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";

import { IconRotateCcw, IconTrash } from "@/components/icons";
import type {
  DrawNGuessDrawing,
  DrawNGuessPoint,
  DrawNGuessStroke,
} from "@/domain/drawnguess/types";
import { cn } from "@/lib/utils";

import { renderDrawing } from "./drawingCanvas";
import { drawingInputBudget, quantizeDrawingPoint, strokeFitsBudget } from "./drawingInput";

const COLORS = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#f59e0b"] as const;
const COLOR_NAMES = {
  "#111827": "black",
  "#dc2626": "red",
  "#2563eb": "blue",
  "#16a34a": "green",
  "#f59e0b": "amber",
};
const SIZES = [4, 8, 14] as const;

export function DrawNGuessWhiteboard({
  value,
  disabled,
  onChange,
}: {
  readonly value: DrawNGuessDrawing;
  readonly disabled?: boolean;
  readonly onChange: (next: DrawNGuessDrawing) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState<(typeof COLORS)[number]>("#111827");
  const [size, setSize] = useState<(typeof SIZES)[number]>(8);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [activeStroke, setActiveStroke] = useState<DrawNGuessStroke | null>(null);
  const activeStrokeRef = useRef<DrawNGuessStroke | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [limitNotice, setLimitNotice] = useState("");
  const budget = useMemo(() => drawingInputBudget(value), [value]);

  const replaceActiveStroke = (stroke: DrawNGuessStroke | null) => {
    activeStrokeRef.current = stroke;
    setActiveStroke(stroke);
  };

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    renderDrawing(canvas, appendActiveStroke(value, activeStroke));
  }, [activeStroke, value]);

  const updateDrawing = (strokes: readonly DrawNGuessStroke[]) => {
    setLimitNotice("");
    onChange({
      format: "strokes-v1",
      width: 1,
      height: 1,
      strokes,
    });
  };

  const startStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    if (disabled || pointerIdRef.current !== null) {
      return;
    }

    const point = pointerPoint(event);
    const stroke: DrawNGuessStroke = {
      id: crypto.randomUUID(),
      color,
      size,
      tool,
      points: [point],
    };
    if (!strokeFitsBudget(stroke, budget)) {
      setLimitNotice("Drawing limit reached. Undo a stroke or clear the board to continue.");
      return;
    }
    pointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    replaceActiveStroke(stroke);
  };

  const moveStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    const stroke = activeStrokeRef.current;
    if (!stroke || disabled || event.pointerId !== pointerIdRef.current) {
      return;
    }

    const point = pointerPoint(event);
    const last = stroke.points.at(-1);
    if (last?.x === point.x && last.y === point.y) return;
    const next = { ...stroke, points: [...stroke.points, point] };
    if (!strokeFitsBudget(next, budget)) {
      setLimitNotice(
        "Stroke limit reached. Your drawing is kept. Lift your finger, or undo to make space.",
      );
      return;
    }
    replaceActiveStroke(next);
  };

  const finishStroke = (event?: PointerEvent<HTMLCanvasElement>) => {
    if (event && event.pointerId !== pointerIdRef.current) return;
    const stroke = activeStrokeRef.current;
    pointerIdRef.current = null;
    if (!stroke || value.format !== "strokes-v1") {
      replaceActiveStroke(null);

      return;
    }

    if (strokeFitsBudget(stroke, budget)) updateDrawing([...value.strokes, stroke]);
    replaceActiveStroke(null);
  };

  // Commit the last visible stroke at the client deadline; the server's grace
  // window can still preserve it as a draft before advancing the turn.
  const finishStrokeRef = useRef(finishStroke);
  finishStrokeRef.current = finishStroke;
  useEffect(() => {
    if (disabled) finishStrokeRef.current();
  }, [disabled]);

  const strokes = value.format === "strokes-v1" ? value.strokes : [];

  return (
    <div className="space-y-3">
      <canvas
        aria-label="Drawing board"
        aria-describedby={limitNotice ? "drawing-limit" : undefined}
        className={cn(
          "aspect-[4/3] w-full touch-none rounded-xl border border-border bg-white shadow-inner",
          disabled ? "opacity-70" : "cursor-crosshair",
        )}
        height={480}
        ref={canvasRef}
        width={640}
        onPointerCancel={finishStroke}
        onPointerDown={startStroke}
        onPointerLeave={finishStroke}
        onPointerMove={moveStroke}
        onPointerUp={finishStroke}
      />

      {limitNotice ? (
        <p id="drawing-limit" role="status" className="text-typ-ui text-muted-foreground">
          {limitNotice}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {COLORS.map((option) => (
          <button
            aria-label={`Use ${COLOR_NAMES[option]} brush`}
            aria-pressed={tool === "pen" && color === option}
            className={cn(
              "size-9 rounded-full border shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tool === "pen" && color === option
                ? "border-primary ring-2 ring-primary/25"
                : "border-border",
            )}
            key={option}
            disabled={disabled}
            style={{ backgroundColor: option }}
            type="button"
            onClick={() => {
              setTool("pen");
              setColor(option);
            }}
          />
        ))}
        <button
          aria-pressed={tool === "eraser"}
          className={cn(
            "rounded-xl border px-3 py-2 text-typ-ui font-semibold transition",
            tool === "eraser" ? "border-primary bg-semantic-primary-soft-bg" : "border-border",
          )}
          type="button"
          disabled={disabled}
          onClick={() => setTool("eraser")}
        >
          Eraser
        </button>
        {SIZES.map((option) => (
          <button
            aria-label={`${option}px brush`}
            aria-pressed={size === option}
            className={cn(
              "flex size-9 items-center justify-center rounded-xl border transition",
              size === option ? "border-primary bg-semantic-primary-soft-bg" : "border-border",
            )}
            key={option}
            disabled={disabled}
            type="button"
            onClick={() => setSize(option)}
          >
            <span
              aria-hidden
              className="rounded-full bg-current"
              style={{ height: option, width: option }}
            />
          </button>
        ))}
        <button
          aria-label="Undo stroke"
          className="ml-auto rounded-xl border border-border p-2 transition hover:bg-muted"
          disabled={disabled || activeStroke !== null || strokes.length === 0}
          type="button"
          onClick={() => updateDrawing(strokes.slice(0, -1))}
        >
          <IconRotateCcw className="size-5" />
        </button>
        <button
          aria-label="Clear drawing"
          className="rounded-xl border border-border p-2 transition hover:bg-muted"
          disabled={disabled || activeStroke !== null || strokes.length === 0}
          type="button"
          onClick={() => updateDrawing([])}
        >
          <IconTrash className="size-5" />
        </button>
      </div>
    </div>
  );
}

function appendActiveStroke(
  drawing: DrawNGuessDrawing,
  activeStroke: DrawNGuessStroke | null,
): DrawNGuessDrawing {
  if (!activeStroke || drawing.format !== "strokes-v1") {
    return drawing;
  }

  return {
    ...drawing,
    strokes: [...drawing.strokes, activeStroke],
  };
}

function pointerPoint(event: PointerEvent<HTMLCanvasElement>): DrawNGuessPoint {
  const rect = event.currentTarget.getBoundingClientRect();

  return quantizeDrawingPoint({
    x: clamp01((event.clientX - rect.left) / rect.width),
    y: clamp01((event.clientY - rect.top) / rect.height),
  });
}

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}
