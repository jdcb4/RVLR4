const STORAGE_KEY = "hat-game.state.v1";

export const loadSavedState = async <T>() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const saveState = async (value: unknown) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private mode / quota — gameplay can still continue in memory.
  }
};

export const clearSavedState = async () => {
  localStorage.removeItem(STORAGE_KEY);
};
