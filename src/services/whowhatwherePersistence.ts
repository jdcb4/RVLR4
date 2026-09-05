import { createDefaultSettings, createTeamSetups } from "@/domain/whowhatwhere/setup";
import type { GameSettings, MatchState, TeamSetup } from "@/domain/whowhatwhere/types";
import { localGameStorage, readValidatedRecord } from "@/services/browserStorage";
import {
  whoWhatWhereMatchSchema,
  whoWhatWhereSetupSchema,
} from "@/services/savedStates/whowhatwhere";

const SETUP_KEY = "whowhatwhere.setup.v1";
const MATCH_KEY = "whowhatwhere.match.v1";
type PersistedSetup = { readonly settings: GameSettings; readonly teams: readonly TeamSetup[] };
export type PersistedMatch = { readonly savedAt: string; readonly match: MatchState };

export function loadSetup(): PersistedSetup {
  const parsed = readValidatedRecord(SETUP_KEY, whoWhatWhereSetupSchema);
  if (parsed) return parsed;
  const settings = createDefaultSettings();
  return { settings, teams: createTeamSetups(settings.teamCount) };
}
export function saveSetup(setup: PersistedSetup) {
  return localGameStorage.write(SETUP_KEY, JSON.stringify({ schemaVersion: 1, ...setup }));
}
export function loadMatch(): PersistedMatch | null {
  const parsed = readValidatedRecord(MATCH_KEY, whoWhatWhereMatchSchema);
  if (parsed?.match.stage === "results") {
    clearMatch();
    return null;
  }
  return parsed;
}
export function saveMatch(match: MatchState, savedAt = new Date()) {
  return localGameStorage.write(
    MATCH_KEY,
    JSON.stringify({ schemaVersion: 1, savedAt: savedAt.toISOString(), match }),
  );
}
export function clearMatch() {
  return localGameStorage.remove(MATCH_KEY);
}
