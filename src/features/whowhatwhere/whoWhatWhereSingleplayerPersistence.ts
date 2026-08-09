import type { GameSettings, MatchState, TeamSetup } from "@/domain/whowhatwhere/types";
import { clearMatch, saveMatch, saveSetup } from "@/services/whowhatwherePersistence";

export function persistWhoWhatWhereSetup(settings: GameSettings, teams: readonly TeamSetup[]) {
  saveSetup({ settings, teams });
}

export function persistWhoWhatWhereMatch(match: MatchState) {
  if (match.stage === "results") {
    clearMatch();
    return;
  }
  saveMatch(match);
}
