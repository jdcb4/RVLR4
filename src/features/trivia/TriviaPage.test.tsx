import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TriviaQuestion } from "@/data/triviaSchema";
import { createTriviaSession, startTriviaQuiz, type TriviaSession } from "@/domain/trivia/game";
import { readSnapshot, removeSnapshot, writeSnapshot } from "@/services/nativeSnapshotStore";

import { TriviaPage } from "./TriviaPage";

// Synthetic test content only. No fixtures are included in the production catalogue.
const questions: TriviaQuestion[] = Array.from({ length: 10 }, (_, index) => ({
  id: `trivia:ui-test-${index + 1}`,
  revision: 1,
  question: `Synthetic question ${index + 1}?`,
  answer: `Synthetic answer ${index + 1}`,
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
  removeSnapshot: vi.fn(async () => {
    storage.value = null;
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
  requireContentPreferences: vi.fn(async () => ({ simpleMode: false })),
  getContentPreferenceState: () => preferences,
  subscribeContentPreferences: () => () => undefined,
  initializeContentPreferences: vi.fn(async () => undefined),
}));
const preferences = { simpleMode: false, loaded: true, busy: false, error: null };
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
  const settings = { ...session.settings, count, revealMode };
  return {
    ...session,
    settings,
    quiz: startTriviaQuiz(settings, questions, { simpleMode: false, packVersion: 2, rng: () => 0 }),
  };
}
beforeEach(() => {
  preferences.simpleMode = false;
  storage.value = null;
  storage.questions = [];
  vi.mocked(readSnapshot).mockClear();
  vi.mocked(removeSnapshot).mockClear();
  vi.mocked(writeSnapshot).mockClear();
});

describe("Trivia phone flow", () => {
  it("shows Easy and disables harder choices in Simple mode while retaining all easy adult content", async () => {
    preferences.simpleMode = true;
    storage.questions = questions.map((question) => ({ ...question, kidAppropriate: false }));
    mount();
    await screen.findByRole("heading", { name: "Set up your quiz" });
    const group = within(screen.getByRole("group", { name: "Difficulty" }));
    expect(group.getByRole("button", { name: "Easy" })).toHaveAttribute("aria-pressed", "true");
    expect(group.getByRole("button", { name: "Medium" })).toBeDisabled();
    expect(group.getByRole("button", { name: "Hard" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Start quiz" })).toBeEnabled();
  });

  it("explains the empty catalogue and disables starting without inventing questions", async () => {
    mount();
    await screen.findByRole("heading", { name: "Set up your quiz" });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Not enough questions match these settings. Choose fewer questions or broaden your selection.",
    );
    expect(screen.getByRole("button", { name: "Start quiz" })).toBeDisabled();
    expect(screen.queryByText(/Synthetic question/)).not.toBeInTheDocument();
  });

  it("reveals without writing in each mode, requires a mark and shows the shared score", async () => {
    storage.value = saved();
    const user = userEvent.setup();
    mount();
    await screen.findByRole("heading", { name: "Your saved quiz" });
    expect(screen.queryByText(/Synthetic question/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Reveal answer" }));
    expect(await screen.findByText(/Synthetic answer/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finish quiz" })).toBeDisabled();
    expect(
      within(screen.getByRole("group", { name: "Mark your answer" }))
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Incorrect", "Correct"]);
    await user.click(screen.getByRole("button", { name: "Correct" }));
    await waitFor(() => expect(storage.value?.quiz?.items[0]?.mark).toBe(true));
    await user.click(screen.getByRole("button", { name: "Finish quiz" }));
    expect(await screen.findByRole("heading", { name: "Quiz complete" })).toBeInTheDocument();
    expect(screen.getByText("1 of 1 correct")).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Question recap" })).getByText("Correct"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New quiz" })).toBeInTheDocument();
  });

  it("disables starting when the selected filters have too few eligible questions", async () => {
    storage.questions = questions.slice(0, 2);
    const user = userEvent.setup();
    mount();
    await screen.findByRole("heading", { name: "Set up your quiz" });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Not enough questions match these settings. Choose fewer questions or broaden your selection.",
    );
    expect(screen.getByRole("button", { name: "Start quiz" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Medium" }));
    expect(screen.getByRole("button", { name: "Start quiz" })).toBeDisabled();
    expect(screen.queryByText(/questions available/)).not.toBeInTheDocument();
  });

  it("uses preset counts, category toggles and a fixed footer without saving setup drafts", async () => {
    storage.questions = questions;
    const user = userEvent.setup();
    mount();
    await screen.findByRole("heading", { name: "Set up your quiz" });
    const counts = screen.getByRole("group", { name: "Questions" });
    expect(
      within(counts)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["10", "20", "30"]);
    expect(screen.queryByRole("button", { name: "Custom" })).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByText(/questions available/)).not.toBeInTheDocument();
    const start = within(screen.getByRole("contentinfo")).getByRole("button", {
      name: "Start quiz",
    });
    expect(start).toBeEnabled();
    await user.click(within(counts).getByRole("button", { name: "20" }));
    expect(start).toBeDisabled();
    await user.click(within(counts).getByRole("button", { name: "10" }));
    expect(start).toBeEnabled();

    const categories = screen.getByRole("group", { name: "Categories" });
    expect(within(categories).getAllByRole("button")).toHaveLength(9);
    expect(within(categories).getAllByRole("button", { pressed: true })).toHaveLength(8);
    await user.click(within(categories).getByRole("button", { name: "Clear all" }));
    expect(within(categories).getAllByRole("button", { pressed: false })).toHaveLength(8);
    expect(screen.getByRole("alert")).toHaveTextContent("Choose at least one category.");
    expect(start).toBeDisabled();
    await user.click(within(categories).getByRole("button", { name: "General knowledge" }));
    expect(start).toBeEnabled();
    expect(within(categories).getByRole("button", { name: "General knowledge" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(categories).getByRole("button", { name: "History" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await user.click(within(categories).getByRole("button", { name: "Select all" }));
    expect(within(categories).getAllByRole("button", { pressed: true })).toHaveLength(8);
    expect(within(categories).getByRole("button", { name: "Clear all" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Medium" }));
    await user.click(screen.getByRole("button", { name: "At the end" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(writeSnapshot).not.toHaveBeenCalled();
    expect(removeSnapshot).not.toHaveBeenCalled();

    await user.click(start);
    await screen.findByRole("textbox", { name: "Your answer" });
    expect(storage.value?.quiz?.items).toHaveLength(10);
    expect(storage.value?.settings).toMatchObject({
      count: 10,
      difficulty: "medium",
      revealMode: "end",
    });
    expect(writeSnapshot).toHaveBeenCalledTimes(1);
  });

  it("always offers optional writing in end mode, auto-marks exact answers and allows overrides", async () => {
    storage.value = saved("end", 2);
    const first = storage.value.quiz!.items[0]!.question.answer;
    const user = userEvent.setup();
    mount();
    await user.click(await screen.findByRole("button", { name: "Resume" }));
    const answer = await screen.findByRole("textbox", { name: "Your answer" });
    expect(answer).toHaveAttribute("placeholder", "Your answer (optional)");
    expect(screen.queryByRole("button", { name: /Hide|Write/ })).not.toBeInTheDocument();
    await user.type(answer, `  ${first.toUpperCase()}  `);
    await waitFor(() =>
      expect(storage.value?.quiz?.items[0]?.writtenAnswer).toBe(`  ${first.toUpperCase()}  `),
    );
    await user.click(await screen.findByRole("button", { name: "Next question" }));
    expect(screen.queryByText(first)).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Finish questions" }));
    expect(
      await screen.findByRole("heading", { name: "Ready for the answers?" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(first)).not.toBeInTheDocument();
    expect(storage.value?.quiz?.phase).toBe("ready");
    await user.click(screen.getByRole("button", { name: "Go to answers" }));
    expect(await screen.findByRole("button", { name: "Correct" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Incorrect" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Incorrect" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    await user.click(screen.getByRole("button", { name: "Next answer" }));
    expect(screen.getByRole("button", { name: "Finish quiz" })).toBeDisabled();
    expect(
      within(screen.getByRole("group", { name: "Mark your answer" }))
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Incorrect", "Correct"]);
    await user.click(screen.getByRole("button", { name: "Correct" }));
    await user.click(await screen.findByRole("button", { name: "Finish quiz" }));
    expect(await screen.findByRole("heading", { name: "Quiz complete" })).toBeInTheDocument();
    expect(screen.getByText("1 of 2 correct")).toBeInTheDocument();
    const recap = screen.getByRole("list", { name: "Question recap" });
    expect(within(recap).getAllByRole("listitem")).toHaveLength(2);
    expect(within(recap).getByText("Incorrect")).toBeInTheDocument();
    expect(within(recap).getByText("Correct")).toBeInTheDocument();
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
    expect(storage.value).toBeNull();
    expect(screen.getByRole("button", { name: "Hard" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("textbox", { name: /Team/ })).not.toBeInTheDocument();
  });
});
