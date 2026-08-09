import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EditableName } from "@/components/EditableName";

describe("EditableName", () => {
  it("uses name-oriented mobile input behavior and finishes on Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EditableName label="Player name" value="Ada" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Edit Player name" }));
    const input = screen.getByRole("textbox", { name: "Player name" });
    expect(input).toHaveAttribute("autocapitalize", "words");
    expect(input).toHaveAttribute("enterkeyhint", "done");

    await user.type(input, " L{Enter}");

    expect(onChange).toHaveBeenCalled();
    expect(screen.queryByRole("textbox", { name: "Player name" })).not.toBeInTheDocument();
  });
});
