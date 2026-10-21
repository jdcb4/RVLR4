import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createDefaultSettings } from "@/domain/whowhatwhere/setup";
import { SettingsScreen } from "@/features/whowhatwhere/setup/SettingsScreen";

describe("SettingsScreen", () => {
  it("keeps timing and assist choices in single rows without changing their values", async () => {
    const user = userEvent.setup();
    const settings = createDefaultSettings();
    const onChange = vi.fn();
    render(<SettingsScreen settings={settings} onChange={onChange} />);

    expect(
      within(screen.getByRole("group", { name: "Turn length" })).getAllByRole("button"),
    ).toHaveLength(4);
    expect(
      within(screen.getByRole("group", { name: "Hints / turn" })).getAllByRole("button"),
    ).toHaveLength(4);

    await user.click(screen.getByRole("button", { name: "75s" }));
    expect(onChange).toHaveBeenCalledWith({ ...settings, turnDurationSeconds: 75 });
  });
});
