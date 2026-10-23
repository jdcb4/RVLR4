import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { SimpleModeSetting } from "@/components/SimpleModeSetting";

import { DifficultySelect } from "./DifficultySelect";

const preference = vi.hoisted(() => ({
  state: { simpleMode: true, loaded: true, busy: false, error: null },
  select: vi.fn(),
}));
vi.mock("@/services/contentPreference", () => ({
  getContentPreferenceState: () => preference.state,
  subscribeContentPreferences: () => () => undefined,
  initializeContentPreferences: vi.fn(),
  selectSimpleMode: preference.select,
}));

it("shows the global override and restores the chosen difficulty when Simple mode is turned off", () => {
  const change = vi.fn();
  const view = render(<DifficultySelect value="hard" onChange={change} />);
  expect(screen.getByRole("button", { name: "Easy" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Medium" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Hard" })).toBeDisabled();
  expect(change).not.toHaveBeenCalled();

  preference.state = { ...preference.state, simpleMode: false };
  view.rerender(<DifficultySelect value="hard" onChange={change} />);
  expect(screen.getByRole("button", { name: "Hard" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Hard" })).toHaveAttribute("aria-pressed", "true");
  expect(change).not.toHaveBeenCalled();
});

it("offers Simple mode with an easy-content description and no child-audience wording", () => {
  preference.state = { ...preference.state, simpleMode: true };
  render(<SimpleModeSetting />);
  expect(screen.getByRole("switch", { name: "Simple mode" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  expect(screen.getByText("Easy words and questions · new games")).toBeInTheDocument();
  expect(screen.queryByText(/kids|ages 8|children/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("switch", { name: "Simple mode" }));
  expect(preference.select).toHaveBeenCalledWith(false);
});
