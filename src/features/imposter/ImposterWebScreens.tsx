import type { NavigateFunction } from "react-router-dom";

import type { ScreenModel } from "@/features/imposter/imposterAppTypes";
import { imposterLandingScreen } from "@/features/imposter/screens/imposterLandingScreen";
import { imposterLoadingScreen } from "@/features/imposter/screens/imposterLoadingScreen";
import { imposterResultsScreen } from "@/features/imposter/screens/imposterResultsScreen";
import { imposterRevealScreen } from "@/features/imposter/screens/imposterRevealScreen";
import { imposterReviewScreen } from "@/features/imposter/screens/imposterReviewScreen";
import { imposterRosterScreen } from "@/features/imposter/screens/imposterRosterScreen";
import { imposterRoundGuidePreDiscussionScreen } from "@/features/imposter/screens/imposterRoundGuidePreDiscussionScreen";
import { imposterRoundGuidePregameScreen } from "@/features/imposter/screens/imposterRoundGuidePregameScreen";
import { imposterRoundGuideRevealWarningScreen } from "@/features/imposter/screens/imposterRoundGuideRevealWarningScreen";
import { imposterSettingsScreen } from "@/features/imposter/screens/imposterSettingsScreen";
import type { ImposterAppController } from "@/features/imposter/useImposterApp";

/** Routes Imposter UI from controller state — one module per screen under `screens/`. */
export function buildImposterScreen(
  controller: ImposterAppController,
  navigate: NavigateFunction,
): ScreenModel {
  if (!controller.loaded) {
    return imposterLoadingScreen();
  }
  const { step } = controller.snapshot;

  if (step === "landing") {
    return imposterLandingScreen(controller);
  }
  if (step === "settings") {
    return imposterSettingsScreen(controller);
  }
  if (step === "roster") {
    return imposterRosterScreen(controller);
  }
  if (step === "review") {
    return imposterReviewScreen(controller);
  }
  if (step === "reveal") {
    return imposterRevealScreen(controller);
  }
  if (step === "guidePregame") {
    return imposterRoundGuidePregameScreen(controller);
  }
  if (step === "guidePrediscussion") {
    return imposterRoundGuidePreDiscussionScreen(controller);
  }
  if (step === "guideWarning") {
    return imposterRoundGuideRevealWarningScreen(controller);
  }
  if (step === "results") {
    return imposterResultsScreen(controller, navigate);
  }

  return imposterLandingScreen(controller);
}
