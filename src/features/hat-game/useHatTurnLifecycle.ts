import { type MutableRefObject, useEffect, useRef, useState } from "react";

import { getCountdownSeconds } from "@/domain/hat-game/time";
import type { HatGameAction } from "@/domain/hat-game/types";
import type { AppSnapshot } from "@/features/hat-game/hatSingleplayerAppTypes";
import { playGameSoundEffect } from "@/services/gameSoundEffects";

export function useHatTurnLifecycle(
  snapshot: AppSnapshot,
  snapshotRef: MutableRefObject<AppSnapshot>,
  dispatch: (action: HatGameAction) => void,
) {
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const warningCueTurnRef = useRef<string | null>(null);
  const turnEndCueTurnRef = useRef<string | null>(null);
  const dispatchRef = useRef(dispatch);

  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  useEffect(() => {
    if (
      snapshot.step !== "game" ||
      snapshot.session?.stage !== "turn" ||
      !snapshot.session.activeTurn?.endsAt
    ) {
      setSecondsRemaining(0);
      warningCueTurnRef.current = null;
      return undefined;
    }
    const turnCueKey = snapshot.session.activeTurn.startedAt;
    const tick = () => {
      const remaining = getCountdownSeconds(snapshotRef.current.session?.activeTurn?.endsAt);
      setSecondsRemaining(remaining);
      if (remaining <= 10 && remaining > 0 && warningCueTurnRef.current !== turnCueKey) {
        warningCueTurnRef.current = turnCueKey;
        void playGameSoundEffect("warn10");
      }
      if (remaining <= 0) dispatchRef.current({ type: "end-turn" });
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [
    snapshot.session?.activeTurn?.endsAt,
    snapshot.session?.activeTurn?.startedAt,
    snapshot.session?.stage,
    snapshot.step,
    snapshotRef,
  ]);

  return { secondsRemaining, turnEndCueTurnRef };
}
