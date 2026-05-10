import type { NavigateFunction } from "react-router-dom";

import type { ScreenModel } from "@/features/hat-game/hatGameAppTypes";
import { hatActiveTurnScreen } from "@/features/hat-game/screens/hatActiveTurnScreen";
import { hatFinalTurnRecapScreen } from "@/features/hat-game/screens/hatFinalTurnRecapScreen";
import { hatReadyScreen } from "@/features/hat-game/screens/hatReadyScreen";
import { hatResultsScreen } from "@/features/hat-game/screens/hatResultsScreen";
import { hatReviewTeamsScreen } from "@/features/hat-game/screens/hatReviewTeamsScreen";
import type { HatGameAppController } from "@/features/hat-game/useHatGameApp";

/**
 * Routes `step === "game"` by session stage — between turns, timed turn, recap, results.
 */
export function hatInGameScreen(
  controller: HatGameAppController,
  navigate: NavigateFunction,
): ScreenModel {
  const session = controller.snapshot.session;
  if (!session) {
    return hatReviewTeamsScreen(controller);
  }

  if (session.stage === "results") {
    return hatResultsScreen(controller, session, navigate);
  }
  if (session.stage === "finalSummary") {
    return hatFinalTurnRecapScreen(controller, session);
  }
  if (session.stage === "turn") {
    return hatActiveTurnScreen(controller, session);
  }
  return hatReadyScreen(controller, session);
}
