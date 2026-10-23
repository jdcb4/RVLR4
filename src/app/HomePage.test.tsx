import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { PassNPlayHubPage } from "@/features/passnplay/PassNPlayHubPage";

function renderHome() {
  render(
    <MemoryRouter>
      <PassNPlayHubPage />
    </MemoryRouter>,
  );
}

describe("Android prototype home", () => {
  it("offers all three independent offline games", () => {
    renderHome();
    expect(screen.getByRole("heading", { name: /RVLRY/i })).toBeInTheDocument();
    expect(screen.queryByText(/Multi-Device mode/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Who What Where/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hat Game/ })).toHaveAttribute("href", "/games/hat");
    expect(screen.getByRole("link", { name: /Imposter/ })).toHaveAttribute(
      "href",
      "/games/imposter",
    );
    expect(screen.getByRole("link", { name: /Who What Where/ })).toHaveAttribute(
      "href",
      "/games/whowhatwhere",
    );
    expect(
      screen.queryByText(/Play or resume|One phone\. Everyone plays\./),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "App information" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens word settings and restores focus when the native cancel event closes them", async () => {
    const user = userEvent.setup();
    renderHome();
    const settings = screen.getByRole("button", { name: "Settings" });
    await user.click(settings);
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(within(dialog).getByRole("button", { name: "Check for new words" })).toBeEnabled();
    expect(within(dialog).getByText("Words and Trivia questions")).toBeInTheDocument();
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(settings).toHaveFocus();
  });

  it("opens app information separately and closes through the shared dialog control", async () => {
    const user = userEvent.setup();
    renderHome();
    const information = screen.getByRole("button", { name: "App information" });
    await user.click(information);
    const dialog = screen.getByRole("dialog", { name: "RVLRY" });
    expect(within(dialog).getByText(/By jdcb4\. Version/)).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "Check for new words" }),
    ).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Close dialog" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(information).toHaveFocus();
  });
});
