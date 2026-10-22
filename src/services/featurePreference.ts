import { z } from "zod";

import { readSnapshot, writeSnapshot } from "@/services/nativeSnapshotStore";

const preferenceSchema = z.object({ schemaVersion: z.literal(1), triviaEnabled: z.boolean() });
const key = "app.features.v1";
type FeatureState = {
  triviaEnabled: boolean;
  busy: boolean;
  loaded: boolean;
  error: string | null;
};
let state: FeatureState = { triviaEnabled: false, busy: false, loaded: false, error: null };
const listeners = new Set<() => void>();
let initializing: Promise<void> | null = null;
let saving: Promise<void> | null = null;

function update(next: Partial<FeatureState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export function subscribeFeaturePreferences(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getFeaturePreferenceState() {
  return state;
}

export function initializeFeaturePreferences(): Promise<void> {
  if (initializing) return initializing;
  if (state.loaded) return Promise.resolve();
  update({ busy: true, error: null });
  initializing = (async () => {
    try {
      const saved = await readSnapshot(key, preferenceSchema);
      update({ triviaEnabled: saved.value?.triviaEnabled ?? false, loaded: true });
    } catch {
      update({
        error:
          "Trivia visibility could not be loaded. Retry in app settings before enabling Trivia.",
      });
    } finally {
      update({ busy: false });
      initializing = null;
    }
  })();
  return initializing;
}

/** Selection cannot silently bypass an unreadable feature preference. */
export async function requireFeaturePreferences(): Promise<{ triviaEnabled: boolean }> {
  await initializeFeaturePreferences();
  if (saving) await saving;
  if (!state.loaded) throw new Error(state.error ?? "Trivia visibility could not be loaded.");
  return { triviaEnabled: state.triviaEnabled };
}

export async function selectTriviaEnabled(triviaEnabled: boolean): Promise<void> {
  if (!state.loaded || state.busy || state.triviaEnabled === triviaEnabled) return;
  update({ busy: true, error: null });
  saving = (async () => {
    try {
      await writeSnapshot(key, { schemaVersion: 1, triviaEnabled });
      update({ triviaEnabled });
    } catch {
      update({ error: "Trivia visibility could not be saved. Please try again." });
    } finally {
      update({ busy: false });
      saving = null;
    }
  })();
  await saving;
}
