import { describe, expect, it } from "vitest";

import type { EmitWithAck } from "./protocol";
import { socketSchemas } from "./socketSchemas";

describe("shared socket contract", () => {
  it("keeps compile-time call examples aligned with runtime validation", async () => {
    const emit: EmitWithAck = async (...[event, payload]) => ({
      ok: socketSchemas[event]?.safeParse(payload).success ?? false,
    });
    expect(await emit("lobby:setReady", { ready: true })).toEqual({ ok: true });
    expect(await emit("hat:startTurn")).toEqual({ ok: true });
    // These directives fail typecheck if the event boundary becomes loose again.
    // @ts-expect-error Unknown event names must be rejected.
    expect(await emit("lobby:setReddy", { ready: true })).toEqual({ ok: false });
    // @ts-expect-error A required payload cannot be omitted.
    expect(await emit("lobby:setReady")).toEqual({ ok: false });
    // @ts-expect-error The payload must belong to this event.
    expect(await emit("lobby:setName", { ready: true })).toEqual({ ok: false });
    // @ts-expect-error Payload values retain the schema's types.
    expect(await emit("lobby:setReady", { ready: "yes" })).toEqual({ ok: false });
  });
});
