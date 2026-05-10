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
    expect(screen.getByRole("heading", { name: /Party games, every phone/i })).toBeInTheDocument();
    expect(screen.getByText(/Who What Where/i)).toBeInTheDocument();
    expect(screen.getByText(/Hat Game/i)).toBeInTheDocument();
    expect(screen.getByText(/Imposter/i)).toBeInTheDocument();
  });
});
