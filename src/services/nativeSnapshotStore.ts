import { Capacitor, registerPlugin } from "@capacitor/core";
import { z } from "zod";

interface SnapshotPair {
  current: string | null;
  previous: string | null;
}

interface RvlryDevicePlugin {
  readContent(options: { kind: "trivia" | "words" }): Promise<SnapshotPair>;
  installContent(options: {
    kind: "trivia" | "words";
    value: string;
    expectedCurrent: string | null;
    retainedPrevious: string | null;
  }): Promise<void>;
  read(options: { key: string }): Promise<SnapshotPair>;
  write(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
  setKeepAwake(options: { enabled: boolean }): Promise<void>;
  setPrivacy(options: { enabled: boolean }): Promise<void>;
}

export const deviceBridge = registerPlugin<RvlryDevicePlugin>("RvlryDevice");

type SnapshotErrorCode = "unavailable" | "corrupt" | "incompatible" | "not-hydrated";

export class SnapshotStoreError extends Error {
  constructor(
    readonly code: SnapshotErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SnapshotStoreError";
  }
}

const pairSchema = z.object({ current: z.string().nullable(), previous: z.string().nullable() });
const envelopeSchema = z.object({
  storageVersion: z.literal(1),
  revision: z.number().int().nonnegative().safe(),
  savedAt: z.string().datetime(),
  payload: z.unknown(),
});

interface LoadedSnapshot {
  revision: number;
  checkpoint: string | null;
  needsRepair: boolean;
  schema: z.ZodTypeAny | null;
}

const loaded = new Map<string, LoadedSnapshot>();
const queues = new Map<string, Promise<unknown>>();
const storageKey = (key: string) => `rvlry.snapshot.${key}`;

/** Reads and deletes share the write queue: pending saves cannot resurrect a discarded game. */
function enqueue<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const result = (queues.get(key) ?? Promise.resolve()).then(operation, operation);
  const tail = result.catch(() => undefined);
  queues.set(key, tail);
  void tail.then(() => {
    if (queues.get(key) === tail) queues.delete(key);
  });
  return result;
}

function corruptSave() {
  return new SnapshotStoreError(
    "corrupt",
    "This saved game could not be read. It has been kept so you can retry or deliberately discard it.",
  );
}

function incompatibleSave() {
  return new SnapshotStoreError(
    "incompatible",
    "This saved game uses an unsupported format. It has been kept; use a compatible app version or deliberately discard it.",
  );
}

async function readPair(key: string): Promise<SnapshotPair> {
  try {
    if (Capacitor.isNativePlatform()) return pairSchema.parse(await deviceBridge.read({ key }));
    const raw = localStorage.getItem(storageKey(key));
    return raw === null ? { current: null, previous: null } : pairSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) throw corruptSave();
    throw new SnapshotStoreError(
      "unavailable",
      "Saved games are unavailable. Retry before continuing.",
    );
  }
}

function decode<T>(raw: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>) {
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    throw corruptSave();
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "storageVersion" in value &&
    value.storageVersion !== 1
  ) {
    throw incompatibleSave();
  }
  const envelope = envelopeSchema.safeParse(value);
  if (!envelope.success) throw corruptSave();
  const parsed = schema.safeParse(envelope.data.payload);
  if (!parsed.success) {
    const unsupportedVersion = parsed.error.issues.some(
      (issue) =>
        issue.path.at(-1) === "schemaVersion" &&
        (issue.code === "invalid_literal" || issue.code === "invalid_enum_value"),
    );
    throw unsupportedVersion ? incompatibleSave() : corruptSave();
  }
  return { value: parsed.data, revision: envelope.data.revision };
}

function highestRevision(pair: SnapshotPair, fallback: number): number {
  return [pair.current, pair.previous].reduce((highest, raw) => {
    if (raw === null) return highest;
    try {
      const envelope = envelopeSchema.safeParse(JSON.parse(raw));
      return envelope.success ? Math.max(highest, envelope.data.revision) : highest;
    } catch {
      return highest;
    }
  }, fallback);
}

/** A failed load never enables writes. Unsupported versions are preserved rather than rolled back. */
export function readSnapshot<T>(
  key: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): Promise<{ value: T | null; recovered: boolean }> {
  return enqueue(key, async () => {
    loaded.delete(key);
    const pair = await readPair(key);
    if (pair.current === null && pair.previous === null) {
      loaded.set(key, { revision: 0, checkpoint: null, needsRepair: false, schema });
      return { value: null, recovered: false };
    }
    if (pair.current !== null) {
      try {
        const current = decode(pair.current, schema);
        loaded.set(key, {
          revision: highestRevision(pair, current.revision),
          checkpoint: pair.current,
          needsRepair: false,
          schema,
        });
        return { value: current.value, recovered: false };
      } catch (error) {
        if (error instanceof SnapshotStoreError && error.code === "incompatible") throw error;
        if (pair.previous === null) throw error;
      }
    }
    const previous = decode(pair.previous!, schema);
    loaded.set(key, {
      revision: highestRevision(pair, previous.revision),
      checkpoint: pair.previous,
      needsRepair: true,
      schema,
    });
    return { value: previous.value, recovered: true };
  });
}

/** Capture values at invocation time; later mutation cannot change an already queued action. */
export async function writeSnapshot(key: string, value: unknown): Promise<void> {
  let payload: string;
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw corruptSave();
    payload = serialized;
  } catch {
    throw new SnapshotStoreError(
      "corrupt",
      "This game could not be saved. Retry before continuing.",
    );
  }
  return enqueue(key, async () => {
    const state = loaded.get(key);
    if (!state) {
      throw new SnapshotStoreError(
        "not-hydrated",
        "Load or deliberately discard the saved game before saving a replacement.",
      );
    }
    const decoded: unknown = JSON.parse(payload);
    const validated = state.schema ? state.schema.safeParse(decoded) : null;
    if (validated && !validated.success) throw corruptSave();
    const revision = state.revision + 1;
    if (!Number.isSafeInteger(revision)) throw incompatibleSave();
    const current = JSON.stringify({
      storageVersion: 1,
      revision,
      savedAt: new Date().toISOString(),
      payload: validated?.success ? validated.data : decoded,
    });
    try {
      if (Capacitor.isNativePlatform()) {
        // Repair first so the next rotation retains the validated recovery checkpoint.
        if (state.needsRepair && state.checkpoint !== null) {
          await deviceBridge.write({ key, value: state.checkpoint });
          state.needsRepair = false;
        }
        await deviceBridge.write({ key, value: current });
      } else {
        localStorage.setItem(
          storageKey(key),
          JSON.stringify({ current, previous: state.checkpoint }),
        );
      }
    } catch {
      throw new SnapshotStoreError(
        "unavailable",
        "Your latest progress could not be saved. Keep the app open and retry before continuing.",
      );
    }
    loaded.set(key, { ...state, revision, checkpoint: current, needsRepair: false });
  });
}

export function removeSnapshot(key: string): Promise<void> {
  return enqueue(key, async () => {
    try {
      if (Capacitor.isNativePlatform()) await deviceBridge.remove({ key });
      else localStorage.removeItem(storageKey(key));
    } catch {
      throw new SnapshotStoreError("unavailable", "The saved game could not be discarded. Retry.");
    }
    loaded.set(key, {
      revision: 0,
      checkpoint: null,
      needsRepair: false,
      schema: loaded.get(key)?.schema ?? null,
    });
  });
}
