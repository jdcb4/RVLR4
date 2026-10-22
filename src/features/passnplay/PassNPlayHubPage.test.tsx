import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";

import { PassNPlayHubPage } from "./PassNPlayHubPage";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: () => ({}),
}));

it("hides Trivia by default and lets Settings show and hide its card without touching saves", async () => {
  localStorage.setItem("rvlry.snapshot.trivia.device.v1", "existing quiz");
  render(
    <MemoryRouter>
      <PassNPlayHubPage />
    </MemoryRouter>,
  );
  expect(screen.queryByRole("link", { name: /Trivia/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  const toggle = await screen.findByRole("switch", { name: "Show Trivia" });
  await waitFor(() => expect(toggle).toBeEnabled());
  fireEvent.click(toggle);
  await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
  fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
  expect(screen.getByRole("link", { name: /Trivia/ })).toHaveAttribute("href", "/games/trivia");
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  fireEvent.click(screen.getByRole("switch", { name: "Show Trivia" }));
  await waitFor(() =>
    expect(screen.getByRole("switch", { name: "Show Trivia" })).toHaveAttribute(
      "aria-checked",
      "false",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
  expect(screen.queryByRole("link", { name: /Trivia/ })).not.toBeInTheDocument();
  expect(localStorage.getItem("rvlry.snapshot.trivia.device.v1")).toBe("existing quiz");
});
