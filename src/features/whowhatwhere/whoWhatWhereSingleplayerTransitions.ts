import { createMatch, endTurn, isTurnExpired } from "@/domain/whowhatwhere/game";
import { validateSetup } from "@/domain/whowhatwhere/setup";
import type { GameSettings, MatchState, TeamSetup } from "@/domain/whowhatwhere/types";
import type { PersistedMatch } from "@/services/whowhatwherePersistence";

export type WhoWhatWhereAppMode =
  | "landing"
  | "settings"
  | "team"
  | "review"
  | "ready"
  | "turn"
  | "finalSummary"
  | "results";

export type MatchCreationResult =
  | { readonly match: MatchState; readonly error: null }
  | { readonly match: null; readonly error: string };

export function createValidatedWhoWhatWhereMatch(
  teams: TeamSetup[],
  settings: GameSettings,
): MatchCreationResult {
  const errors = validateSetup(teams, settings);
  if (errors.length > 0) return { match: null, error: errors[0] ?? "Check the setup." };
  try {
    return { match: createMatch(teams, settings), error: null };
  } catch (error) {
    return {
      match: null,
      error: error instanceof Error ? error.message : "Unable to start.",
    };
  }
}

export function restoreWhoWhatWhereMatch(pending: PersistedMatch): MatchState {
  const match = pending.match;
  return match.stage === "turn" && match.activeTurn && isTurnExpired(match.activeTurn)
    ? endTurn(match)
    : match;
}

export function nextWhoWhatWhereTeamStep(
  currentStep: number,
  teamCount: number,
): { readonly step: number; readonly mode: "team" | "review" } {
  return currentStep < teamCount - 1
    ? { step: currentStep + 1, mode: "team" }
    : { step: currentStep, mode: "review" };
}
