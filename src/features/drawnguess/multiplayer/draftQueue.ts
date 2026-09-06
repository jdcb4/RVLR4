import type { EmitWithAck, SocketReply, SocketRequestArgs } from "@/domain/multiplayer/protocol";

/** One in-flight draft and one latest replacement. Submitting cancels unsent drafts. */
export function createDraftQueue(
  send: EmitWithAck,
  onDraftResult: (reply: SocketReply) => void,
  intervalMs = 1000,
) {
  let pending: SocketRequestArgs | null = null;
  let inFlight: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let version = 0;
  let disposed = false;
  let submitting = false;

  const safelySend = async (args: SocketRequestArgs): Promise<SocketReply> => {
    try {
      return await send(...args);
    } catch {
      return {
        ok: false,
        error: "Your response could not be saved. Check the connection and submit again.",
      };
    }
  };
  const schedule = () => {
    if (!disposed && pending && !timer && !inFlight)
      timer = setTimeout(() => {
        timer = undefined;
        void flush();
      }, intervalMs);
  };
  const flush = async (): Promise<void> => {
    clearTimeout(timer);
    timer = undefined;
    if (inFlight) {
      await inFlight;
      return flush();
    }
    if (disposed || !pending) return;
    const request = pending;
    pending = null;
    const requestVersion = version;
    inFlight = safelySend(request).then((reply) => {
      if (!disposed && requestVersion === version) onDraftResult(reply);
    });
    try {
      await inFlight;
    } finally {
      inFlight = null;
      schedule();
    }
  };
  const clearPending = () => {
    version += 1;
    pending = null;
    clearTimeout(timer);
    timer = undefined;
  };

  return {
    update(args: SocketRequestArgs) {
      if (disposed || submitting) return;
      version += 1;
      pending = args;
      schedule();
    },
    flush,
    async submit(args: SocketRequestArgs): Promise<SocketReply> {
      clearPending();
      submitting = true;
      try {
        await inFlight;
        if (disposed) return { ok: false, error: "The turn has changed." };
        return await safelySend(args);
      } finally {
        submitting = false;
      }
    },
    dispose() {
      disposed = true;
      clearPending();
    },
  };
}
