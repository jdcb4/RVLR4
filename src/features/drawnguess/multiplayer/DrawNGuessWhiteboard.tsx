import { type PointerEvent, useEffect, useRef, useState } from "react";

import { IconRotateCcw, IconTrash } from "@/components/icons";
import type {
  DrawNGuessDrawing,
  DrawNGuessPoint,
  DrawNGuessStroke,
} from "@/domain/drawnguess/types";
import { cn } from "@/lib/utils";

import { renderDrawing } from "./drawingCanvas";

const COLORS = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#f59e0b"] as const;
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

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    renderDrawing(canvas, appendActiveStroke(value, activeStroke));
  }, [activeStroke, value]);

  const updateDrawing = (strokes: readonly DrawNGuessStroke[]) => {
    onChange({
      format: "strokes-v1",
      width: 1,
      height: 1,
      strokes,
    });
  };

  const startStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    if (disabled) {
      return;
    }

    const point = pointerPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveStroke({
      id: crypto.randomUUID(),
      color,
      size,
      tool,
      points: [point],
    });
  };

  const moveStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!activeStroke || disabled) {
      return;
    }

    const point = pointerPoint(event);
    setActiveStroke({
      ...activeStroke,
      points: [...activeStroke.points, point],
    });
  };

  const finishStroke = () => {
    if (!activeStroke || value.format !== "strokes-v1") {
      setActiveStroke(null);

      return;
    }

    updateDrawing([...value.strokes, activeStroke]);
    setActiveStroke(null);
  };

  const strokes = value.format === "strokes-v1" ? value.strokes : [];

  return (
    <div className="space-y-3">
      <canvas
        aria-label="Drawing board"
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

      <div className="flex flex-wrap items-center gap-2">
        {COLORS.map((option) => (
          <button
            aria-label={`Use ${option} brush`}
            aria-pressed={tool === "pen" && color === option}
            className={cn(
              "size-9 rounded-full border shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tool === "pen" && color === option
                ? "border-primary ring-2 ring-primary/25"
                : "border-border",
            )}
            key={option}
            style={{ backgroundColor: option }}
            type="button"
            onClick={() => {
              setTool("pen");
              setColor(option);
            }}
          />
        ))}
        <button
          className={cn(
            "rounded-xl border px-3 py-2 text-typ-ui font-semibold transition",
            tool === "eraser" ? "border-primary bg-semantic-primary-soft-bg" : "border-border",
          )}
          type="button"
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
          disabled={strokes.length === 0}
          type="button"
          onClick={() => updateDrawing(strokes.slice(0, -1))}
        >
          <IconRotateCcw className="size-5" />
        </button>
        <button
          aria-label="Clear drawing"
          className="rounded-xl border border-border p-2 transition hover:bg-muted"
          disabled={strokes.length === 0}
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

  return {
    x: clamp01((event.clientX - rect.left) / rect.width),
    y: clamp01((event.clientY - rect.top) / rect.height),
  };
}

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}
