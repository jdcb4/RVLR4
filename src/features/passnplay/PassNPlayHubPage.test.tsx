import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";

import { PassNPlayHubPage } from "./PassNPlayHubPage";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: () => ({}),
}));

beforeEach(() => localStorage.clear());

const legacyDisabledPreference = JSON.stringify({
  current: JSON.stringify({
    storageVersion: 1,
    revision: 1,
    savedAt: "2026-10-24T00:00:00.000Z",
    payload: { schemaVersion: 1, triviaEnabled: false },
  }),
  previous: null,
});

it.each([
  ["no preference", null],
  ["a legacy disabled preference", legacyDisabledPreference],
  ["a corrupt legacy preference", "corrupt"],
])("always shows Trivia with %s and offers no visibility setting", (_label, preference) => {
  const preferenceKey = "rvlry.snapshot.app.features.v1";
  const quizKey = "rvlry.snapshot.trivia.device.v3";
  if (preference !== null) localStorage.setItem(preferenceKey, preference);
  localStorage.setItem(quizKey, "existing quiz");
  render(
    <MemoryRouter>
      <PassNPlayHubPage />
    </MemoryRouter>,
  );
  expect(screen.getByRole("link", { name: /Trivia/ })).toHaveAttribute("href", "/games/trivia");
  expect(screen.getAllByRole("link")).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  expect(screen.queryByText(/Show Trivia/)).not.toBeInTheDocument();
  expect(screen.queryByRole("switch", { name: /Trivia/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
  expect(screen.getByRole("link", { name: /Trivia/ })).toBeInTheDocument();
  expect(localStorage.getItem(quizKey)).toBe("existing quiz");
  expect(localStorage.getItem(preferenceKey)).toBe(preference);
});
