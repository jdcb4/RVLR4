import type { Socket } from "socket.io-client";

const REQUEST_TIMEOUT_MS = 8_000;

export type SocketReply = { ok: boolean; error?: string; code?: string };

/** Socket.IO removes timed-out and disconnected acknowledgements internally. */
export function requestSocketAck(
  socket: Socket,
  event: string,
  payload?: unknown,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<SocketReply> {
  if (!socket.connected) {
    return Promise.resolve({ ok: false, code: "DISCONNECTED", error: "Reconnecting to the room." });
  }
  return new Promise((resolve) => {
    try {
      socket
        .timeout(timeoutMs)
        .emit(
          event,
          ...(payload === undefined ? [] : [payload]),
          (error: Error | null, reply: unknown) => {
            if (error) {
              resolve({
                ok: false,
                code: socket.connected ? "REQUEST_TIMEOUT" : "DISCONNECTED",
                error: socket.connected
                  ? "The request timed out. Check the room before trying the action again."
                  : "Connection lost. Reconnect before trying the action again.",
              });
            } else if (
              reply &&
              typeof reply === "object" &&
              "ok" in reply &&
              typeof reply.ok === "boolean"
            ) {
              resolve({
                ok: reply.ok,
                ...("error" in reply && typeof reply.error === "string"
                  ? { error: reply.error }
                  : {}),
                ...("code" in reply && typeof reply.code === "string" ? { code: reply.code } : {}),
              });
            } else {
              resolve({
                ok: false,
                code: "INVALID_RESPONSE",
                error: "The server returned an incomplete response. Try reconnecting.",
              });
            }
          },
        );
    } catch {
      resolve({
        ok: false,
        code: "DISCONNECTED",
        error: "Unable to send the request. Try reconnecting.",
      });
    }
  });
}

/** The deadline covers response-body parsing as well as the initial fetch. */
export async function requestHttp<T>(
  url: string,
  read: (response: Response) => Promise<T>,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  let rejectBoundary: (error: Error) => void = () => {};
  let timer: ReturnType<typeof setTimeout>;
  const boundary = new Promise<never>((_, reject) => {
    rejectBoundary = reject;
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("The request timed out. Check your connection and try again."));
    }, timeoutMs);
  });
  const cancel = () => {
    controller.abort();
    rejectBoundary(new DOMException("Request cancelled.", "AbortError"));
  };
  if (init.signal?.aborted) cancel();
  else init.signal?.addEventListener("abort", cancel, { once: true });
  try {
    return await Promise.race([
      fetch(url, { ...init, signal: controller.signal }).then(read),
      boundary,
    ]);
  } finally {
    clearTimeout(timer!);
    init.signal?.removeEventListener("abort", cancel);
  }
}
