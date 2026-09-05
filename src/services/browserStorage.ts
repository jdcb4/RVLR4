import type { z } from "zod";

let storageNotice: string | null = null;
let dismissedNotice: string | null = null;
const listeners = new Set<() => void>();

function reportStorageIssue(message: string) {
  if (storageNotice === message || dismissedNotice === message) return;
  dismissedNotice = null;
  storageNotice = message;
  queueMicrotask(() => listeners.forEach((listener) => listener()));
}

export const getStorageNotice = () => storageNotice;
export const subscribeStorageNotice = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export function dismissStorageNotice() {
  dismissedNotice = storageNotice;
  storageNotice = null;
  listeners.forEach((listener) => listener());
}

/** Failed writes/removals take precedence over stale disk data for this page. */
export function createBrowserStorage(area: "localStorage" | "sessionStorage") {
  const cache = new Map<string, string>();
  const pending = new Map<string, string | null>();
  const unavailable = () =>
    reportStorageIssue(
      "Browser storage is unavailable. You can keep playing in this tab, but refreshing or closing it may lose your game or room session.",
    );
  const read = (key: string): string | null => {
    if (pending.has(key)) return pending.get(key) ?? null;
    try {
      const value = window[area].getItem(key);
      if (value === null) cache.delete(key);
      else cache.set(key, value);
      return value;
    } catch {
      unavailable();
      return cache.get(key) ?? null;
    }
  };
  const write = (key: string, value: string): boolean => {
    cache.set(key, value);
    try {
      window[area].setItem(key, value);
      pending.delete(key);
      return true;
    } catch {
      pending.set(key, value);
      unavailable();
      return false;
    }
  };
  const remove = (key: string): boolean => {
    cache.delete(key);
    try {
      window[area].removeItem(key);
      pending.delete(key);
      return true;
    } catch {
      pending.set(key, null);
      unavailable();
      return false;
    }
  };
  return { read, write, remove };
}

export const localGameStorage = createBrowserStorage("localStorage");
export const roomSessionStorage = createBrowserStorage("sessionStorage");

export function readStoredJson(
  storage: ReturnType<typeof createBrowserStorage>,
  key: string,
): unknown {
  const raw = storage.read(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    discardStoredRecord(storage, key);
    return null;
  }
}

export function discardStoredRecord(storage: ReturnType<typeof createBrowserStorage>, key: string) {
  storage.remove(key);
  reportStorageIssue(
    "A saved game or session could not be read and was cleared. You can start a new game or join a new seat.",
  );
}

export function readValidatedRecord<T>(
  key: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): T | null {
  const raw = readStoredJson(localGameStorage, key);
  if (raw === null) return null;
  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data;
  discardStoredRecord(localGameStorage, key);
  return null;
}
