import { z } from "zod";

import { readSnapshot, writeSnapshot } from "@/services/nativeSnapshotStore";

export const themes = [
  { id: "classic", name: "Classic", description: "The original RVLRY" },
  { id: "pub-trivia", name: "After-Hours Social", description: "Chalkboard, amber & letterpress" },
  { id: "bookclub", name: "The Margin Note", description: "Parchment, sage & ink" },
  { id: "recess", name: "Recess", description: "Bright paper & playful shapes" },
  { id: "observatory", name: "Midnight Observatory", description: "Twilight, brass & starlight" },
] as const;

const themeSchema = z.enum(["classic", "pub-trivia", "bookclub", "recess", "observatory"]);
export type ThemeId = z.infer<typeof themeSchema>;
const preferenceSchema = z.object({ schemaVersion: z.literal(1), theme: themeSchema });
const key = "app.appearance.v1";
type ThemeState = { theme: ThemeId; busy: boolean; loaded: boolean; error: string | null };
let state: ThemeState = { theme: "classic", busy: false, loaded: false, error: null };
const listeners = new Set<() => void>();
let initializing: Promise<void> | null = null;

function update(next: Partial<ThemeState>) {
  state = { ...state, ...next };
  document.documentElement.dataset.theme = state.theme;
  listeners.forEach((listener) => listener());
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getThemeState() {
  return state;
}

/** Load independently of game saves. Failure leaves games available in Classic. */
export function initializeTheme(): Promise<void> {
  if (initializing) return initializing;
  update({ busy: true, error: null });
  initializing = (async () => {
    try {
      const saved = await readSnapshot(key, preferenceSchema);
      update({ theme: saved.value?.theme ?? "classic", loaded: true });
    } catch {
      update({ error: "Your theme could not be loaded. Retry to keep your saved choice." });
    } finally {
      update({ busy: false });
      initializing = null;
    }
  })();
  return initializing;
}

/** Publish only after the durable commit; failed writes never masquerade as saved choices. */
export async function selectTheme(theme: ThemeId): Promise<void> {
  if (!state.loaded || state.busy || theme === state.theme) return;
  update({ busy: true, error: null });
  try {
    await writeSnapshot(key, { schemaVersion: 1, theme });
    update({ theme });
  } catch {
    update({ error: "That theme could not be saved. Please select it again to retry." });
  } finally {
    update({ busy: false });
  }
}
