import { afterEach, describe, expect, it, vi } from "vitest";

import type { EmitWithAck, SocketReply } from "@/domain/multiplayer/protocol";

import { createDraftQueue } from "./draftQueue";

afterEach(() => vi.useRealTimers());

describe("drawing draft queue", () => {
  it("coalesces rapid edits and keeps only one request in flight on a slow connection", async () => {
    vi.useFakeTimers();
    const replies: ((reply: SocketReply) => void)[] = [];
    const send = vi.fn<EmitWithAck>(() => new Promise((resolve) => replies.push(resolve)));
    const onResult = vi.fn();
    const queue = createDraftQueue(send, onResult);
    queue.update(["drawnguess:updateGuessDraft", { text: "R" }]);
    queue.update(["drawnguess:updateGuessDraft", { text: "Robot " }]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenLastCalledWith("drawnguess:updateGuessDraft", { text: "Robot " });
    queue.update(["drawnguess:updateGuessDraft", { text: "Robot c" }]);
    queue.update(["drawnguess:updateGuessDraft", { text: "Robot chef" }]);
    await vi.advanceTimersByTimeAsync(4000);
    expect(send).toHaveBeenCalledTimes(1);
    replies[0]!({ ok: false, error: "stale" });
    await vi.advanceTimersByTimeAsync(1000);
    expect(onResult).not.toHaveBeenCalled();
    expect(send).toHaveBeenLastCalledWith("drawnguess:updateGuessDraft", { text: "Robot chef" });
    replies[1]!({ ok: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(onResult).toHaveBeenCalledWith({ ok: true });
    queue.dispose();
  });

  it("submits the latest full value after an in-flight draft and cancels pending work", async () => {
    vi.useFakeTimers();
    let finishDraft: (reply: SocketReply) => void = () => {};
    const send = vi
      .fn<EmitWithAck>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishDraft = resolve;
          }),
      )
      .mockResolvedValue({ ok: true });
    const queue = createDraftQueue(send, vi.fn());
    queue.update(["drawnguess:updateGuessDraft", { text: "old" }]);
    await vi.advanceTimersByTimeAsync(1000);
    queue.update(["drawnguess:updateGuessDraft", { text: "pending" }]);
    const submitted = queue.submit(["drawnguess:submitGuess", { text: "final" }]);
    expect(send).toHaveBeenCalledTimes(1);
    finishDraft({ ok: true });
    expect(await submitted).toEqual({ ok: true });
    await vi.advanceTimersByTimeAsync(2000);
    expect(send.mock.calls).toEqual([
      ["drawnguess:updateGuessDraft", { text: "old" }],
      ["drawnguess:submitGuess", { text: "final" }],
    ]);
    queue.update(["drawnguess:updateGuessDraft", { text: "discard on turn change" }]);
    queue.dispose();
    await vi.advanceTimersByTimeAsync(2000);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("contains send failures and can send a later explicit submission", async () => {
    const send = vi
      .fn<EmitWithAck>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ ok: true });
    const onResult = vi.fn();
    const queue = createDraftQueue(send, onResult);
    queue.update(["drawnguess:updateGuessDraft", { text: "Robot" }]);
    await queue.flush();
    expect(onResult.mock.calls[0]?.[0]).toMatchObject({ ok: false });
    expect(await queue.submit(["drawnguess:submitGuess", { text: "Robot" }])).toEqual({ ok: true });
    queue.dispose();
  });
});
