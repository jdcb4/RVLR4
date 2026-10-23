import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createDefaultSettings } from "@/domain/whowhatwhere/setup";
import type { GameSettings } from "@/domain/whowhatwhere/types";
import { SettingsScreen } from "@/features/whowhatwhere/setup/SettingsScreen";

describe("SettingsScreen", () => {
  it("keeps every setting labelled and preserves team, timing and category choices", async () => {
    const user = userEvent.setup();
    const settings = createDefaultSettings();
    const onChange = vi.fn();
    render(<SettingsScreen settings={settings} onChange={onChange} />);

    expect(
      within(screen.getByRole("group", { name: "Turn length" })).getAllByRole("button"),
    ).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "60s" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "75s" })).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("group", { name: "Hints / turn" })).getAllByRole("button"),
    ).toHaveLength(4);
    expect(
      within(screen.getByRole("group", { name: "Teams" })).getAllByRole("button"),
    ).toHaveLength(3);
    expect(
      within(screen.getByRole("group", { name: "Categories" })).getAllByRole("button"),
    ).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "45s" }));
    expect(onChange).toHaveBeenCalledWith({ ...settings, turnDurationSeconds: 45 });

    await user.click(
      within(screen.getByRole("group", { name: "Teams" })).getByRole("button", { name: "3" }),
    );
    expect(onChange).toHaveBeenCalledWith({ ...settings, teamCount: 3 });

    await user.click(screen.getByRole("button", { name: "Who" }));
    expect(onChange).toHaveBeenCalledWith({
      ...settings,
      selectedCategories: settings.selectedCategories.filter((category) => category !== "Who"),
    });

    const difficulty = screen.getByRole("group", { name: "Difficulty" });
    expect(within(difficulty).getAllByRole("button")).toHaveLength(3);
    expect(within(difficulty).getByRole("button", { name: "Hard" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(within(difficulty).getByRole("button", { name: "Medium" }));
    expect(onChange).toHaveBeenCalledWith({ ...settings, wordDifficulty: "medium" });
  });

  it("resets every setting through the existing change callback", async () => {
    const user = userEvent.setup();
    const settings: GameSettings = {
      teamCount: 4,
      turnDurationSeconds: 75,
      totalRounds: 1,
      skipLimit: -1,
      selectedCategories: ["Who"],
      difficultyMode: "hard",
      wordDifficulty: "hard",
      simpleMode: true,
      hints: { enabled: true, perTurnLimit: 3 },
    };
    const onChange = vi.fn();
    render(<SettingsScreen settings={settings} onChange={onChange} />);

    // Rendering an older saved duration must not silently rewrite it.
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Reset to defaults" }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      teamCount: 2,
      turnDurationSeconds: 30,
      totalRounds: 3,
      skipLimit: 1,
      selectedCategories: ["What", "Who", "Where"],
      difficultyMode: "easy",
      wordDifficulty: "hard",
      simpleMode: false,
      hints: { enabled: false, perTurnLimit: 0 },
    });
  });
});
