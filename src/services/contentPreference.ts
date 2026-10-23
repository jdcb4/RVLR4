import { z } from "zod";

import { readSnapshot, writeSnapshot } from "@/services/nativeSnapshotStore";

const preferenceSchema = z.object({ schemaVersion: z.literal(2), simpleMode: z.boolean() });
const key = "app.content.v2";
type ContentState = { simpleMode: boolean; busy: boolean; loaded: boolean; error: string | null };
let state: ContentState = { simpleMode: false, busy: false, loaded: false, error: null };
const listeners = new Set<() => void>();
let initializing: Promise<void> | null = null;
let saving: Promise<void> | null = null;

function update(next: Partial<ContentState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export function subscribeContentPreferences(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getContentPreferenceState() {
  return state;
}

export function initializeContentPreferences(): Promise<void> {
  if (initializing) return initializing;
  if (state.loaded) return Promise.resolve();
  update({ busy: true, error: null });
  initializing = (async () => {
    try {
      const saved = await readSnapshot(key, preferenceSchema);
      update({ simpleMode: saved.value?.simpleMode ?? false, loaded: true });
    } catch {
      update({
        error: "Simple mode could not be loaded. Retry in app settings before selecting new words.",
      });
    } finally {
      update({ busy: false });
      initializing = null;
    }
  })();
  return initializing;
}

/** Selection waits for the last acknowledged difficulty preference. */
export async function requireContentPreferences(): Promise<{ simpleMode: boolean }> {
  await initializeContentPreferences();
  if (saving) await saving;
  if (!state.loaded) throw new Error(state.error ?? "Simple mode could not be loaded.");
  return { simpleMode: state.simpleMode };
}

export async function selectSimpleMode(simpleMode: boolean): Promise<void> {
  if (!state.loaded || state.busy || state.simpleMode === simpleMode) return;
  update({ busy: true, error: null });
  saving = (async () => {
    try {
      await writeSnapshot(key, { schemaVersion: 2, simpleMode });
      update({ simpleMode });
    } catch {
      update({ error: "Simple mode could not be saved. Please try again." });
    } finally {
      update({ busy: false });
      saving = null;
    }
  })();
  await saving;
}
