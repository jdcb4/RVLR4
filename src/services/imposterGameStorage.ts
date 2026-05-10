const STORAGE_KEY = "imposter.state.v1";

export const loadImposterSavedState = async <T>() => {
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

export const saveImposterState = async (value: unknown) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private mode / quota — gameplay can still continue in memory.
  }
};

export const clearImposterSavedState = async () => {
  localStorage.removeItem(STORAGE_KEY);
};
