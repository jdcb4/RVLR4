import type { HatGameAction, HatGameSession } from "@/domain/hat-game/types";
import type { SoundCue } from "@/services/hatGameSound";

/**
 * Ref object compatible with `useRef<string | null>` — we avoid importing React
 * so this helper stays easy to unit test.
 */
export type StringOrNullRef = { current: string | null };

/**
 * Plays Web Audio cues after a successful `applyHatGameAction` result.
 * Keeps the same order and conditions as the in-app flow (including turn-end dedupe).
 */
export function playHatGameActionSoundEffects(
  previousSession: HatGameSession,
  nextSession: HatGameSession,
  action: HatGameAction,
  turnEndCueTurnRef: StringOrNullRef,
  playCue: (cue: SoundCue) => void,
): void {
  if (action.type === "start-turn" && previousSession.stage === "ready" && nextSession.stage === "turn") {
    playCue("turn-start");
  }
  if (action.type === "mark-correct") {
    playCue("correct");
  }
  if (action.type === "skip-clue") {
    playCue("skip");
  }
  if (previousSession.stage === "turn" && nextSession.stage !== "turn") {
    const turnCueKey =
      previousSession.activeTurn?.startedAt ?? previousSession.activeTurn?.endsAt ?? "";
    if (turnEndCueTurnRef.current !== turnCueKey) {
      turnEndCueTurnRef.current = turnCueKey;
      playCue("turn-end");
    }
  }
  if (nextSession.phaseNumber !== previousSession.phaseNumber) {
    if (nextSession.phaseNumber === 2) {
      playCue("phase-one-word");
    }
    if (nextSession.phaseNumber === 3) {
      playCue("phase-charades");
    }
  }
}
