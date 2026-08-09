import { type Dispatch, type SetStateAction, useEffect } from "react";

import { endTurn, isTurnExpired } from "@/domain/whowhatwhere/game";
import type { MatchState } from "@/domain/whowhatwhere/types";
import { playGameSoundEffect } from "@/services/gameSoundEffects";

export function useWhoWhatWhereTurnTicker(
  match: MatchState | null,
  setMatch: Dispatch<SetStateAction<MatchState | null>>,
) {
  useEffect(() => {
    if (match?.stage !== "turn" || !match.activeTurn) return undefined;
    const interval = window.setInterval(() => {
      setMatch((current) => {
        if (
          !current?.activeTurn ||
          current.stage !== "turn" ||
          !isTurnExpired(current.activeTurn)
        ) {
          return current;
        }
        void playGameSoundEffect("timeout");
        return endTurn(current);
      });
    }, 250);
    return () => window.clearInterval(interval);
  }, [match?.activeTurn, match?.stage, setMatch]);
}
