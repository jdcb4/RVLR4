import type { DrawNGuessDrawing } from "@/domain/drawnguess/types";

export function createBlankDrawing(): DrawNGuessDrawing {
  return {
    format: "strokes-v1",
    width: 1,
    height: 1,
    strokes: [],
  };
}

export function renderDrawing(canvas: HTMLCanvasElement, drawing: DrawNGuessDrawing) {
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (drawing.format !== "strokes-v1") {
    return;
  }

  for (const stroke of drawing.strokes) {
    const first = stroke.points[0];

    if (!first) {
      continue;
    }

    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.moveTo(first.x * canvas.width, first.y * canvas.height);

    for (const point of stroke.points.slice(1)) {
      ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
    }

    ctx.stroke();
  }
}
