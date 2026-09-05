import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ModalDialog } from "@/components/ModalDialog";
import { OptionButton, OptionGroup } from "@/components/setup/OptionGroup";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open options</button>
      {open ? (
        <ModalDialog title="Game options" onClose={() => setOpen(false)}>
          <button>Confirm</button>
        </ModalDialog>
      ) : null}
    </>
  );
}

describe("accessible controls", () => {
  it("names the modal, opens it in the native top layer, and restores focus after cancel", async () => {
    const user = userEvent.setup();
    const show = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open options" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Game options" });
    expect(show).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    show.mockRestore();
  });

  it("closes using the visible button and exposes selected options", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Harness />
        <OptionGroup label="Duration">
          <OptionButton selected onClick={() => {}}>
            30 seconds
          </OptionButton>
          <OptionButton selected={false} onClick={() => {}}>
            60 seconds
          </OptionButton>
        </OptionGroup>
      </>,
    );
    expect(screen.getByRole("button", { name: "30 seconds", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "60 seconds", pressed: false })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open options" }));
    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
