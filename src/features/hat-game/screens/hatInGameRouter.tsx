import type { NavigateFunction } from "react-router-dom";

import type { ScreenModel } from "@/features/hat-game/hatSingleplayerAppTypes";
import { hatActiveTurnScreen } from "@/features/hat-game/screens/hatActiveTurnScreen";
import { hatFinalTurnRecapScreen } from "@/features/hat-game/screens/hatFinalTurnRecapScreen";
import { hatReadyScreen } from "@/features/hat-game/screens/hatReadyScreen";
import { hatResultsScreen } from "@/features/hat-game/screens/hatResultsScreen";
import { hatReviewTeamsScreen } from "@/features/hat-game/screens/hatReviewTeamsScreen";
import type { HatSingleplayerAppController } from "@/features/hat-game/useHatSingleplayerApp";

/**
 * Routes `step === "game"` by session stage — between turns, timed turn, recap, results.
 */
export function hatInGameScreen(
  controller: HatSingleplayerAppController,
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
