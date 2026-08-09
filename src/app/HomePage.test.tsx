import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { MultiplayerHomePage } from "@/features/multiplayer/MultiplayerHomePage";

describe("MultiplayerHomePage", () => {
  it("lists join + host entry points", () => {
    render(
      <MemoryRouter>
        <MultiplayerHomePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /RVLRY/i })).toBeInTheDocument();
    expect(screen.getByText(/Multi-Device mode/i)).toBeInTheDocument();
    expect(screen.getByText(/Who What Where/i)).toBeInTheDocument();
    expect(screen.getByText(/Hat Game/i)).toBeInTheDocument();
    expect(screen.getByText(/Imposter/i)).toBeInTheDocument();
    const joinCode = screen.getByPlaceholderText(/Join code/i);
    expect(joinCode).toHaveAttribute("enterkeyhint", "go");
    expect(joinCode).toHaveAttribute("autocapitalize", "characters");
    expect(joinCode).toHaveAttribute("spellcheck", "false");
  });
});
