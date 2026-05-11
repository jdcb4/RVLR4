const STORAGE_KEY = "jd-multiplayer-active-game";

/** Single saved row for “resume” on the home page while a match is still in progress. */
export type ActiveGameBookmark = {
  readonly code: string;
  readonly gameKind: "whowhatwhere" | "hat" | "imposter";
  /** ISO timestamp — set locally when we first see the room enter `playing`. */
  readonly startedAtIso: string;
};

export function writeActiveGameBookmark(entry: ActiveGameBookmark): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // private mode / quota — ignore
  }
}

export function readActiveGameBookmark(): ActiveGameBookmark | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<ActiveGameBookmark>;

    if (
      typeof parsed.code !== "string" ||
      (parsed.gameKind !== "whowhatwhere" &&
        parsed.gameKind !== "hat" &&
        parsed.gameKind !== "imposter") ||
      typeof parsed.startedAtIso !== "string"
    ) {
      return null;
    }

    return {
      code: parsed.code.toUpperCase(),
      gameKind: parsed.gameKind,
      startedAtIso: parsed.startedAtIso,
    };
  } catch {
    return null;
  }
}

export function clearActiveGameBookmark(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
