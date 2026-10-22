import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TriviaQuestion } from "@/data/triviaSchema";
import { createTriviaSession, startTriviaQuiz, type TriviaSession } from "@/domain/trivia/game";
import { readSnapshot, writeSnapshot } from "@/services/nativeSnapshotStore";

import { TriviaPage } from "./TriviaPage";

// Synthetic test content only. No fixtures are included in the production catalogue.
const questions: TriviaQuestion[] = [1, 2].map((number) => ({
  id: `trivia:ui-test-${number}`,
  revision: 1,
  question: `Synthetic question ${number}?`,
  answer: `Synthetic answer ${number}`,
  acceptableAnswers: [],
  category: "general",
  difficulty: "easy",
  kidAppropriate: true,
  review: {
    reviewedAt: "2026-10-20T00:00:00.000Z",
    reviewer: "Test fixture",
    sources: ["https://example.com/test-fixture"],
  },
}));
const storage = vi.hoisted(() => ({
  value: null as TriviaSession | null,
  questions: [] as TriviaQuestion[],
}));
vi.mock("@/services/nativeSnapshotStore", () => ({
  readSnapshot: vi.fn(async () => ({ value: storage.value, recovered: false })),
  writeSnapshot: vi.fn(async (_key: string, value: TriviaSession) => {
    storage.value = value;
  }),
}));
vi.mock("@/services/contentPacks/store", () => ({
  loadTriviaCatalogue: vi.fn(async () => ({
    pack: {
      schemaVersion: 1,
      kind: "trivia",
      version: 2,
      publishedAt: "2026-10-20T00:00:00.000Z",
      questions: storage.questions,
    },
    source: "current",
    warning: null,
  })),
}));
vi.mock("@/services/contentPreference", () => ({
  requireContentPreferences: vi.fn(async () => ({ kidsMode: false })),
  getContentPreferenceState: () => preferences,
  subscribeContentPreferences: () => () => undefined,
  initializeContentPreferences: vi.fn(async () => undefined),
}));
const preferences = { kidsMode: false, loaded: true, busy: false, error: null };
vi.mock("@/services/deviceLifecycle", () => ({
  isDeviceActive: () => true,
  setDeviceKeepAwake: vi.fn(async () => undefined),
  subscribeDeviceActivity: () => () => undefined,
}));

function mount() {
  return render(
    <MemoryRouter>
      <TriviaPage />
    </MemoryRouter>,
  );
}
function saved(revealMode: "each" | "end" = "each", count = 1) {
  const session = createTriviaSession();
  const settings = { ...session.settings, count, revealMode, teams: ["Otters", "Owls"] };
  return {
    ...session,
    settings,
    quiz: startTriviaQuiz(settings, questions, { kidsMode: false, packVersion: 2, rng: () => 0 }),
  };
}
beforeEach(() => {
  storage.value = null;
  storage.questions = [];
  vi.mocked(readSnapshot).mockClear();
  vi.mocked(writeSnapshot).mockClear();
});

describe("Trivia phone flow", () => {
  it("explains the empty catalogue and disables starting without inventing questions", async () => {
    mount();
    expect(
      await screen.findByRole("heading", { name: "Questions are not available yet" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start quiz" })).toBeDisabled();
    expect(screen.queryByText(/Synthetic question/)).not.toBeInTheDocument();
  });

  it("keeps saved content covered until Resume, persists optional writing, and self-marks", async () => {
    storage.value = saved();
    const user = userEvent.setup();
    mount();
    await screen.findByRole("heading", { name: "Your saved quiz" });
    expect(screen.queryByText(/Synthetic question/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume" }));
    await user.click(await screen.findByRole("button", { name: "Write answers here (optional)" }));
    await user.type(screen.getByRole("textbox", { name: "Otters answer" }), "Our draft");
    await waitFor(() => expect(storage.value?.quiz?.items[0]?.writtenAnswers[0]).toBe("Our draft"));
    await user.click(await screen.findByRole("button", { name: "Reveal answer" }));
    expect(await screen.findByText(/Synthetic answer/)).toBeInTheDocument();
    expect(screen.getByText("Our draft")).toBeInTheDocument();
    await user.click(
      within(screen.getByRole("group", { name: "Mark Otters" })).getByRole("button", {
        name: "Correct",
      }),
    );
    await user.click(
      within(screen.getByRole("group", { name: "Mark Owls" })).getByRole("button", {
        name: "Incorrect",
      }),
    );
    await user.click(screen.getByRole("button", { name: "See results" }));
    expect(await screen.findByRole("heading", { name: "Quiz complete" })).toBeInTheDocument();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
    expect(screen.getByText("0 / 1")).toBeInTheDocument();
  });

  it("disables starting when the selected filters have too few eligible questions", async () => {
    storage.questions = questions;
    const user = userEvent.setup();
    mount();
    await screen.findByRole("heading", { name: "Set up your quiz" });
    expect(screen.getByText(/2 questions available/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start quiz" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Custom" }));
    const count = screen.getByRole("spinbutton", { name: "Custom count (1–100)" });
    await user.clear(count);
    await user.type(count, "1");
    await waitFor(() => expect(screen.getByRole("button", { name: "Start quiz" })).toBeEnabled());
    await user.selectOptions(screen.getByRole("combobox", { name: "Difficulty" }), "hard");
    await waitFor(() => expect(screen.getByRole("button", { name: "Start quiz" })).toBeDisabled());
    expect(screen.getByText(/0 questions available/)).toBeInTheDocument();
  });

  it("waits until the last question to show end-reveal answers", async () => {
    storage.value = saved("end", 2);
    const user = userEvent.setup();
    mount();
    await user.click(await screen.findByRole("button", { name: "Resume" }));
    expect(screen.queryByText(/Synthetic answer/)).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Next question" }));
    expect(screen.queryByText(/Synthetic answer/)).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Reveal answers" }));
    expect(await screen.findByText(/Synthetic answer/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next answer" }));
    await user.click(screen.getByRole("button", { name: "See results" }));
    expect(await screen.findByRole("heading", { name: "Quiz complete" })).toBeInTheDocument();
  });

  it("requires confirmation to replace a saved quiz", async () => {
    storage.value = saved();
    const user = userEvent.setup();
    mount();
    await user.click(await screen.findByRole("button", { name: "Start new quiz" }));
    const dialog = screen.getByRole("dialog", { name: "Start a new quiz?" });
    await user.click(within(dialog).getByRole("button", { name: "Keep current quiz" }));
    expect(storage.value?.quiz).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Start new quiz" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Start new quiz" }),
    );
    expect(await screen.findByRole("heading", { name: "Set up your quiz" })).toBeInTheDocument();
    expect(storage.value?.quiz).toBeNull();
    expect(screen.getByRole("textbox", { name: "Team 1" })).toHaveValue("Otters");
  });
});
