import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { updateContent } from "@/services/contentPacks/update";

import { ContentUpdatesSetting } from "./ContentUpdatesSetting";

vi.mock("@/services/contentPacks/update", () => ({ updateContent: vi.fn() }));

const update = vi.mocked(updateContent);
type UpdateResult = Awaited<ReturnType<typeof updateContent>>;

beforeEach(() => {
  update.mockReset();
});

it("checks only on request and blocks repeated presses while checking", async () => {
  let complete!: (result: UpdateResult) => void;
  update.mockReturnValue(new Promise((resolve) => (complete = resolve)));
  render(<ContentUpdatesSetting />);
  const button = screen.getByRole("button", { name: "Check for new words" });
  const revealStatus = vi.spyOn(screen.getByRole("status"), "scrollIntoView");
  expect(button).toHaveAccessibleDescription("Words and Trivia questions");
  expect(update).not.toHaveBeenCalled();

  act(() => {
    fireEvent.click(button);
    fireEvent.click(button);
  });
  expect(update).toHaveBeenCalledTimes(1);
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute("aria-busy", "true");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Checking for new words and Trivia questions…",
  );
  expect(revealStatus).not.toHaveBeenCalled();

  await act(async () => complete({ updated: [], failures: [] }));
  expect(button).toBeEnabled();
  expect(button).toHaveAttribute("aria-busy", "false");
  expect(screen.getByRole("status")).toHaveTextContent("No new content updates are available.");
  expect(revealStatus).toHaveBeenCalledExactlyOnceWith({ block: "nearest" });
});

it.each<{ result: UpdateResult; message: string }>([
  {
    result: { updated: ["words", "trivia"], failures: [] },
    message: "New words and Trivia questions are ready for new games.",
  },
  {
    result: { updated: ["words"], failures: [] },
    message: "New words are ready for new games.",
  },
  {
    result: { updated: ["trivia"], failures: [] },
    message: "New Trivia questions are ready for new games.",
  },
])("reports the successful result: $message", async ({ result, message }) => {
  update.mockResolvedValue(result);
  render(<ContentUpdatesSetting />);
  fireEvent.click(screen.getByRole("button", { name: "Check for new words" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(message));
});

it.each<{ result: UpdateResult; message: string }>([
  {
    result: { updated: ["words"], failures: ["trivia"] },
    message:
      "Words updated. Couldn't check Trivia questions. Your existing Trivia questions are still available. Try again.",
  },
  {
    result: { updated: ["trivia"], failures: ["words"] },
    message:
      "Trivia questions updated. Couldn't check words. Your existing words are still available. Try again.",
  },
  {
    result: { updated: [], failures: ["trivia"] },
    message:
      "Couldn't check Trivia questions. Your existing Trivia questions are still available. Try again.",
  },
  {
    result: { updated: [], failures: ["words"] },
    message: "Couldn't check words. Your existing words are still available. Try again.",
  },
  {
    result: { updated: [], failures: ["words", "trivia"] },
    message:
      "Couldn't check for updates. Your existing words and Trivia questions are still available. Try again.",
  },
])("keeps failure feedback specific: $message", async ({ result, message }) => {
  update.mockResolvedValue(result);
  render(<ContentUpdatesSetting />);
  const button = screen.getByRole("button", { name: "Check for new words" });
  fireEvent.click(button);
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(message));
  expect(button).toBeEnabled();
});

it("handles a rejected check and lets the user retry", async () => {
  update.mockRejectedValueOnce(new Error("Network failure"));
  update.mockResolvedValueOnce({ updated: [], failures: [] });
  render(<ContentUpdatesSetting />);
  const button = screen.getByRole("button", { name: "Check for new words" });
  fireEvent.click(button);
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "Couldn't check for updates. Your existing words and Trivia questions are still available. Try again.",
    ),
  );
  fireEvent.click(button);
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("No new content updates are available."),
  );
  expect(update).toHaveBeenCalledTimes(2);
});

it("allows Settings to close while a check finishes without updating a later mount", async () => {
  let complete!: (result: UpdateResult) => void;
  update.mockReturnValue(new Promise((resolve) => (complete = resolve)));
  const first = render(<ContentUpdatesSetting />);
  fireEvent.click(screen.getByRole("button", { name: "Check for new words" }));
  first.unmount();
  render(<ContentUpdatesSetting />);

  await act(async () => complete({ updated: ["words", "trivia"], failures: [] }));
  expect(update).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  expect(screen.getByRole("button", { name: "Check for new words" })).toBeEnabled();
});
