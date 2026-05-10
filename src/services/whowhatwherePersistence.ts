import { createDefaultSettings, createTeamSetups } from "@/domain/whowhatwhere/setup";
import {
  CATEGORIES,
  type Category,
  type GameSettings,
  type MatchState,
  type TeamSetup,
} from "@/domain/whowhatwhere/types";

const SETUP_KEY = "whowhatwhere.setup.v1";
const MATCH_KEY = "whowhatwhere.match.v1";

type PersistedSetup = {
  readonly settings: GameSettings;
  readonly teams: readonly TeamSetup[];
};

export type PersistedMatch = {
  readonly savedAt: string;
  readonly match: MatchState;
};

export function loadSetup(): PersistedSetup {
  const fallbackSettings = createDefaultSettings();
  const fallback = {
    settings: fallbackSettings,
    teams: createTeamSetups(fallbackSettings.teamCount),
  };
  const parsed = readJson<Partial<PersistedSetup>>(SETUP_KEY);

  if (!parsed?.settings || !parsed.teams) {
    return fallback;
  }

  return {
    settings: normalizeSettings(parsed.settings),
    teams: parsed.teams,
  };
}

export function saveSetup(setup: PersistedSetup) {
  writeJson(SETUP_KEY, setup);
}

export function loadMatch(): PersistedMatch | null {
  const parsed = readJson<PersistedMatch>(MATCH_KEY);

  if (!parsed?.savedAt || !parsed.match || parsed.match.gameId !== "whowhatwhere") {
    return null;
  }

  const normalized: PersistedMatch = {
    savedAt: parsed.savedAt,
    match: normalizeMatch(parsed.match),
  };

  if (normalized.match.stage === "results") {
    clearMatch();
    return null;
  }

  return normalized;
}

export function saveMatch(match: MatchState, savedAt = new Date()) {
  writeJson(MATCH_KEY, {
    savedAt: savedAt.toISOString(),
    match,
  });
}

export function clearMatch() {
  localStorage.removeItem(MATCH_KEY);
}

function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);

    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can fail in private browsing or quota pressure; gameplay still works in memory.
  }
}

function normalizeSettings(settings: Partial<GameSettings>): GameSettings {
  const defaults = createDefaultSettings();
  const selectedCategories =
    settings.selectedCategories?.filter((category): category is Category =>
      CATEGORIES.includes(category),
    ) ?? defaults.selectedCategories;

  return {
    ...defaults,
    ...settings,
    selectedCategories:
      selectedCategories.length > 0 ? selectedCategories : defaults.selectedCategories,
    hints: {
      ...defaults.hints,
      ...settings.hints,
    },
  };
}

function normalizeMatch(match: MatchState): MatchState {
  return {
    ...match,
    settings: normalizeSettings(match.settings),
    turnSummaries: match.turnSummaries ?? [],
    results: match.results
      ? {
          ...match.results,
          bestTurn: match.results.bestTurn ?? null,
        }
      : null,
  };
}
