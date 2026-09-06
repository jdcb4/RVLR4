import { useEffect } from "react";

import type { GameSettings, MatchState, TeamSetup } from "@/domain/whowhatwhere/types";
import {
  persistWhoWhatWhereMatch,
  persistWhoWhatWhereSetup,
} from "@/features/whowhatwhere/whoWhatWhereSingleplayerPersistence";

export function useWhoWhatWherePersistence(
  settings: GameSettings,
  teams: readonly TeamSetup[],
  match: MatchState | null,
) {
  useEffect(() => {
    persistWhoWhatWhereSetup(settings, teams);
  }, [settings, teams]);

  useEffect(() => {
    if (match) persistWhoWhatWhereMatch(match);
  }, [match]);
}
