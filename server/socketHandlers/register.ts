import { type HandlerContext,registerHandler } from "../socketHandle.ts";
import type { SocketEventName, SocketPayload } from "../socketSchemas.ts";
import type { SocketHandlerContext } from "./types.ts";

export function createSocketHandlerRegistrar({ socket, store }: SocketHandlerContext) {
  return <E extends SocketEventName>(
    event: E,
    message: string,
    handler: (context: HandlerContext, payload: SocketPayload<E>) => Promise<void> | void,
  ) => registerHandler(socket, store, event, message, handler);
}
