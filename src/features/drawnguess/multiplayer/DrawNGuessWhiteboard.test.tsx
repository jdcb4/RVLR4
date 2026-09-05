import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import type { DrawNGuessDrawing } from "@/domain/drawnguess/types";

import { DrawNGuessWhiteboard } from "./DrawNGuessWhiteboard";

afterEach(() => vi.restoreAllMocks());

it("retains a full drawing with a limit notice and disables editing tools after submission", () => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const value: DrawNGuessDrawing = {
    format: "strokes-v1",
    width: 1,
    height: 1,
    strokes: Array.from({ length: 200 }, (_, i) => ({
      id: String(i),
      color: "#111827",
      size: 4,
      tool: "pen",
      points: [{ x: 0.5, y: 0.5 }],
    })),
  };
  const onChange = vi.fn();
  const { rerender } = render(<DrawNGuessWhiteboard value={value} onChange={onChange} />);
  fireEvent.pointerDown(screen.getByLabelText("Drawing board"));
  expect(screen.getByRole("status")).toHaveTextContent("Drawing limit reached");
  expect(onChange).not.toHaveBeenCalled();
  rerender(<DrawNGuessWhiteboard value={value} onChange={onChange} disabled />);
  expect(screen.getByRole("button", { name: "Undo stroke" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Clear drawing" })).toBeDisabled();
});
