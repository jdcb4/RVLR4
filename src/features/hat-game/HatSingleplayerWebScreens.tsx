import type { NavigateFunction } from "react-router-dom";

import type { ScreenModel } from "@/features/hat-game/hatSingleplayerAppTypes";
import { hatClueEntryScreen } from "@/features/hat-game/screens/hatClueEntryScreen";
import { hatInGameScreen } from "@/features/hat-game/screens/hatInGameRouter";
import { hatLandingScreen } from "@/features/hat-game/screens/hatLandingScreen";
import { hatLoadingScreen } from "@/features/hat-game/screens/hatLoadingScreen";
import { hatReviewTeamsScreen } from "@/features/hat-game/screens/hatReviewTeamsScreen";
import { hatSettingsScreen } from "@/features/hat-game/screens/hatSettingsScreen";
import { hatTeamSetupScreen } from "@/features/hat-game/screens/hatTeamSetupScreen";
import type { HatSingleplayerAppController } from "@/features/hat-game/useHatSingleplayerApp";

/**
 * Chooses the Hat Game screen from controller state — thin router matching WWW’s `WhoWhatWhereSingleplayerApp` composition style.
 * Per-step builders live under `screens/`.
 */
export function buildHatSingleplayerScreen(
  controller: HatSingleplayerAppController,
  navigate: NavigateFunction,
): ScreenModel {
  if (!controller.loaded) {
    return hatLoadingScreen();
  }
  if (controller.snapshot.step === "landing") {
    return hatLandingScreen(controller);
  }
  if (controller.snapshot.step === "settings") {
    return hatSettingsScreen(controller);
  }
  if (controller.snapshot.step === "team") {
    return hatTeamSetupScreen(controller);
  }
  if (controller.snapshot.step === "review") {
    return hatReviewTeamsScreen(controller);
  }
  if (controller.snapshot.step === "clues") {
    return hatClueEntryScreen(controller);
  }
  return hatInGameScreen(controller, navigate);
}
