import { operationalLog } from "./operationalLog.ts";
import type { SocketAck } from "./socketHandle.ts";

/** Socket arguments are untrusted, including anything in the callback position. */
export function readSocketRequest(args: readonly unknown[], operation: string) {
  const last = args.at(-1);
  const callback = typeof last === "function" ? (last as SocketAck) : undefined;
  const payloads = callback ? args.slice(0, -1) : args;

  return {
    payload: payloads[0],
    valid: payloads.length <= 1,
    ack: (response: Parameters<SocketAck>[0]) => {
      try {
        callback?.(response);
      } catch {
        operationalLog("error", "socket_ack_error", { operation });
      }
    },
  };
}

export function reportSocketFailure(operation: string, error: unknown) {
  // Business-rule rejections currently use plain Error. Log their class too so
  // an unexpected plain Error cannot disappear; never log payloads or secrets.
  operationalLog(
    error instanceof Error && error.name === "Error" ? "warn" : "error",
    "socket_error",
    {
      operation,
      errorClass: error instanceof Error ? error.name : "UnknownError",
    },
  );
}
