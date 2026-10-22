import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TriviaQuestion } from "@/data/triviaSchema";
import {
  createTriviaSession,
  nextTriviaQuestion,
  revealTriviaAnswer,
  setTriviaAnswer,
  startTriviaQuiz,
  triviaSessionSchema,
} from "@/domain/trivia/game";
import { useTrivia } from "@/features/trivia/useTrivia";
import { loadTriviaCatalogue } from "@/services/contentPacks/store";
import { requireContentPreferences } from "@/services/contentPreference";
import { setDeviceKeepAwake } from "@/services/deviceLifecycle";
import * as snapshots from "@/services/nativeSnapshotStore";

const device = vi.hoisted(() => ({ activity: null as ((active: boolean) => void) | null }));

vi.mock("@/services/contentPacks/store", () => ({ loadTriviaCatalogue: vi.fn() }));
vi.mock("@/services/contentPreference", () => ({ requireContentPreferences: vi.fn() }));
vi.mock("@/services/deviceLifecycle", () => ({
  isDeviceActive: () => true,
  setDeviceKeepAwake: vi.fn(async () => undefined),
  subscribeDeviceActivity: (listener: (active: boolean) => void) => {
    device.activity = listener;
    listener(true);
    return () => {
      device.activity = null;
    };
  },
}));

const key = "trivia.device.v2";
const storageKey = `rvlry.snapshot.${key}`;
const settings = () => ({ ...createTriviaSession().settings, count: 2 });
const question = (id: number, extra: Partial<TriviaQuestion> = {}): TriviaQuestion => ({
  id: `trivia:test-${String(id)}`,
  revision: 1,
  question: `Synthetic question ${String(id)}?`,
  answer: `Answer ${String(id)}`,
  acceptableAnswers: [],
  category: "general",
  difficulty: "easy",
  kidAppropriate: true,
  review: {
    reviewedAt: "2026-01-01T00:00:00.000Z",
    reviewer: "Automated test fixture",
    sources: ["https://example.com/test-fixture"],
  },
  ...extra,
});
const questions = () => [question(1), question(2), question(3, { kidAppropriate: false })];

function content(items = questions()) {
  return {
    pack: {
      schemaVersion: 1 as const,
      kind: "trivia" as const,
      version: 2,
      publishedAt: "2026-01-01T00:00:00.000Z",
      questions: items,
    },
    source: "current" as const,
    warning: null,
  };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  localStorage.clear();
  device.activity = null;
  vi.mocked(loadTriviaCatalogue).mockResolvedValue(content());
  vi.mocked(requireContentPreferences).mockResolvedValue({ kidsMode: false });
});

async function mount() {
  const hook = renderHook(useTrivia);
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

describe("Trivia durable controller", () => {
  it("publishes only committed settings and serializes rapid answers against the latest save", async () => {
    const hook = await mount();
    const gate = deferred();
    const originalWrite = snapshots.writeSnapshot;
    const write = vi.spyOn(snapshots, "writeSnapshot").mockImplementationOnce(async (id, value) => {
      await gate.promise;
      await originalWrite(id, value);
    });
    const updated = { ...settings(), revealMode: "end" as const };
    let saving!: Promise<void>;
    act(() => {
      saving = hook.result.current.saveSettings(updated);
    });
    expect(hook.result.current.session?.settings.revealMode).toBe("each");
    await act(async () => {
      gate.resolve();
      await saving;
      await hook.result.current.start(updated);
    });
    const answerGate = deferred();
    write.mockImplementationOnce(async (id, value) => {
      await answerGate.promise;
      await originalWrite(id, value);
    });
    let answer1!: Promise<void>;
    let answer2!: Promise<void>;
    let answer3!: Promise<void>;
    act(() => {
      answer1 = hook.result.current.changeQuiz((quiz) => setTriviaAnswer(quiz, "A"));
      answer2 = hook.result.current.changeQuiz((quiz) => setTriviaAnswer(quiz, "B"));
      answer3 = hook.result.current.changeQuiz((quiz) => setTriviaAnswer(quiz, "Answer"));
    });
    expect(hook.result.current.session?.quiz?.items[0]?.writtenAnswer).toBe("");
    await act(async () => {
      answerGate.resolve();
      await Promise.all([answer1, answer2, answer3]);
    });
    expect(hook.result.current.session?.quiz?.items[0]?.writtenAnswer).toBe("Answer");
    const saved = await snapshots.readSnapshot(key, triviaSessionSchema);
    expect(saved.value?.quiz?.items[0]?.writtenAnswer).toBe("Answer");
    hook.unmount();
  });

  it("retains a failed checkpoint and blocks later queued edits until retry commits it", async () => {
    const hook = await mount();
    await act(async () => hook.result.current.start(settings()));
    const before = localStorage.getItem(storageKey);
    const write = vi
      .spyOn(snapshots, "writeSnapshot")
      .mockRejectedValueOnce(new Error("Disk full"));
    let outcomes!: Promise<PromiseSettledResult<void>[]>;
    act(() => {
      outcomes = Promise.allSettled([
        hook.result.current.changeQuiz((quiz) => setTriviaAnswer(quiz, "First")),
        hook.result.current.changeQuiz((quiz) => setTriviaAnswer(quiz, "Blocked")),
      ]);
    });
    await act(async () => {
      expect((await outcomes).map((result) => result.status)).toEqual(["rejected", "rejected"]);
    });
    expect(localStorage.getItem(storageKey)).toBe(before);
    expect(hook.result.current.error).toBe("Disk full");
    expect(hook.result.current.session?.quiz?.items[0]?.writtenAnswer).toBe("");
    expect(write).toHaveBeenCalledTimes(1);
    await act(async () => hook.result.current.retry());
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.session?.quiz?.items[0]?.writtenAnswer).toBe("First");
    await act(async () =>
      hook.result.current.changeQuiz((quiz) => setTriviaAnswer(quiz, "After retry")),
    );
    expect(hook.result.current.session?.quiz?.items[0]?.writtenAnswer).toBe("After retry");
    hook.unmount();
  });

  it("preserves unreadable saved bytes and enables writes only after a successful load retry", async () => {
    localStorage.setItem(storageKey, "corrupt saved bytes");
    const write = vi.spyOn(snapshots, "writeSnapshot");
    const hook = renderHook(useTrivia);
    await waitFor(() => expect(hook.result.current.error).toBeTruthy());
    expect(hook.result.current.ready).toBe(false);
    await act(async () => {
      await expect(hook.result.current.start(settings())).rejects.toThrow();
    });
    expect(localStorage.getItem(storageKey)).toBe("corrupt saved bytes");
    expect(write).not.toHaveBeenCalled();
    // Simulate externally restored valid storage, then explicitly retry the read.
    localStorage.removeItem(storageKey);
    await act(async () => hook.result.current.retry());
    expect(hook.result.current.ready).toBe(true);
    expect(hook.result.current.session?.quiz).toBeNull();
    hook.unmount();
  });

  it("freezes Kids mode at selection, keeps game records independent and resets to saved settings", async () => {
    const otherKey = "rvlry.snapshot.whowhatwhere.device-session.v1";
    localStorage.setItem(otherKey, "untouched original checkpoint");
    vi.mocked(requireContentPreferences).mockResolvedValue({ kidsMode: true });
    const hook = await mount();
    await act(async () => hook.result.current.start(settings()));
    expect(hook.result.current.session?.quiz?.kidsMode).toBe(true);
    expect(
      hook.result.current.session?.quiz?.items.every((item) => item.question.kidAppropriate),
    ).toBe(true);
    expect(requireContentPreferences).toHaveBeenCalledTimes(1);
    await act(async () => hook.result.current.reset());
    expect(hook.result.current.session?.quiz).toBeNull();
    expect(hook.result.current.session?.settings.count).toBe(2);
    expect(localStorage.getItem(otherKey)).toBe("untouched original checkpoint");
    hook.unmount();
  });

  it("restores behind a cover, commits Resume, skips expired future questions and releases keep-awake", async () => {
    const now = Date.now();
    const items = [question(1), question(2)].map((item) => ({
      ...item,
      expiresAt: new Date(now + 1000).toISOString(),
    }));
    await snapshots.readSnapshot(key, triviaSessionSchema);
    const quiz = startTriviaQuiz(settings(), items, { kidsMode: false, packVersion: 2, now });
    await snapshots.writeSnapshot(key, { ...createTriviaSession(), settings: quiz.settings, quiz });
    const hook = await mount();
    expect(hook.result.current.resumePending).toBe(true);
    expect(setDeviceKeepAwake).not.toHaveBeenCalledWith(true);
    const beforeResume = localStorage.getItem(storageKey);
    await act(async () => hook.result.current.resume());
    expect(hook.result.current.resumePending).toBe(false);
    expect(localStorage.getItem(storageKey)).not.toBe(beforeResume);
    expect(setDeviceKeepAwake).toHaveBeenLastCalledWith(true);
    act(() => device.activity?.(false));
    expect(hook.result.current.resumePending).toBe(true);
    expect(setDeviceKeepAwake).toHaveBeenLastCalledWith(false);
    act(() => device.activity?.(true));
    expect(hook.result.current.resumePending).toBe(true);
    vi.spyOn(Date, "now").mockReturnValue(now + 2000);
    await act(async () => {
      await hook.result.current.resume();
      await hook.result.current.changeQuiz((current) =>
        nextTriviaQuestion(revealTriviaAnswer(current)),
      );
    });
    expect(hook.result.current.session?.quiz?.phase).toBe("results");
    expect(hook.result.current.session?.quiz?.items[1]?.excluded).toBe(true);
    expect(setDeviceKeepAwake).toHaveBeenLastCalledWith(false);
    hook.unmount();
    expect(device.activity).toBeNull();
  });

  it("does not uncover a delayed start after the app backgrounds", async () => {
    const hook = await mount();
    const gate = deferred();
    const originalWrite = snapshots.writeSnapshot;
    vi.spyOn(snapshots, "writeSnapshot").mockImplementationOnce(async (id, value) => {
      await gate.promise;
      await originalWrite(id, value);
    });
    let starting!: Promise<void>;
    act(() => {
      starting = hook.result.current.start(settings());
    });
    await waitFor(() => expect(snapshots.writeSnapshot).toHaveBeenCalledTimes(1));
    act(() => device.activity?.(false));
    await act(async () => {
      gate.resolve();
      await starting;
    });
    expect(hook.result.current.session?.quiz).not.toBeNull();
    expect(hook.result.current.resumePending).toBe(true);
    hook.unmount();
  });

  it("finishes already queued draft saves after leaving the page", async () => {
    const hook = await mount();
    await act(async () => hook.result.current.start(settings()));
    const gate = deferred();
    const originalWrite = snapshots.writeSnapshot;
    vi.spyOn(snapshots, "writeSnapshot").mockImplementationOnce(async (id, value) => {
      await gate.promise;
      await originalWrite(id, value);
    });
    let saving!: Promise<void>;
    act(() => {
      saving = hook.result.current.changeQuiz((quiz) => setTriviaAnswer(quiz, "Last draft"));
    });
    hook.unmount();
    gate.resolve();
    await saving;
    const saved = await snapshots.readSnapshot(key, triviaSessionSchema);
    expect(saved.value?.quiz?.items[0]?.writtenAnswer).toBe("Last draft");
    expect(setDeviceKeepAwake).toHaveBeenLastCalledWith(false);
  });

  it("preserves the existing quiz when Kids preferences fail and reports catalogue fallback separately", async () => {
    vi.mocked(loadTriviaCatalogue).mockResolvedValue({
      ...content(),
      warning: "Installed Trivia content is unavailable. Using bundled content.",
    });
    const hook = await mount();
    await act(async () => hook.result.current.start(settings()));
    const before = localStorage.getItem(storageKey);
    const savedQuiz = hook.result.current.session?.quiz;
    vi.mocked(requireContentPreferences).mockRejectedValueOnce(new Error("Kids mode unavailable"));
    await act(async () => {
      await expect(hook.result.current.start(settings())).rejects.toThrow("Kids mode unavailable");
    });
    expect(hook.result.current.session?.quiz).toBe(savedQuiz);
    expect(localStorage.getItem(storageKey)).toBe(before);
    expect(hook.result.current.error).toBe("Kids mode unavailable");
    expect(hook.result.current.warning).toContain("Using bundled content");
    hook.unmount();
  });
});
