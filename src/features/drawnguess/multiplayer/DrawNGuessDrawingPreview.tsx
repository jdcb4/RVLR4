import { useEffect, useRef } from "react";

import type { DrawNGuessDrawing } from "@/domain/drawnguess/types";

import { renderDrawing } from "./drawingCanvas";

export function DrawNGuessDrawingPreview({
  drawing,
  className,
}: {
  readonly drawing: DrawNGuessDrawing;
  readonly className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    renderDrawing(canvas, drawing);
  }, [drawing]);

  if (drawing.format === "placeholder-v1") {
    return (
      <div
        className={`flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-border bg-background p-4 text-center text-typ-card-title font-semibold text-muted-foreground ${className ?? ""}`}
      >
        {drawing.text}
      </div>
    );
  }

  return (
    <canvas
      aria-label="Drawing"
      className={`aspect-[4/3] w-full rounded-xl border border-border bg-white shadow-inner ${className ?? ""}`}
      height={480}
      ref={canvasRef}
      width={640}
    />
  );
}
