import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TeamStandingsList } from "@/components/game/TeamStandingsList";

describe("TeamStandingsList", () => {
  it("renders each team name with its score", () => {
    render(
      <TeamStandingsList
        teams={[
          { id: "red", name: "Red", score: 12 },
          { id: "blue", name: "Blue", score: 9 },
        ]}
      />,
    );

    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Blue")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });
});
