import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { PassNPlayHubPage } from "@/features/passnplay/PassNPlayHubPage";

describe("Android prototype home", () => {
  it("offers the converted game and clearly identifies the next games", () => {
    render(
      <MemoryRouter>
        <PassNPlayHubPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /RVLRY/i })).toBeInTheDocument();
    expect(screen.queryByText(/Multi-Device mode/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Who What Where/i)).toBeInTheDocument();
    expect(screen.getByText("Hat Game")).toBeInTheDocument();
    expect(screen.getByText("Imposter")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Who What Where/ })).toHaveAttribute(
      "href",
      "/games/whowhatwhere",
    );
    expect(screen.getByRole("button", { name: /Check for new words/ })).toBeDisabled();
  });
});
