import { buildGameLandingScreen } from "@/components/game/buildGameLandingScreen";
import type { ScreenModel } from "@/features/hat-game/hatSingleplayerAppTypes";
import type { HatSingleplayerAppController } from "@/features/hat-game/useHatSingleplayerApp";

export function hatLandingScreen(controller: HatSingleplayerAppController): ScreenModel {
  return buildGameLandingScreen({
    controller,
    subtitle:
      "A pass-and-play Celebrity-style party game. Add famous figures, split into teams, then race through Describe, One Word, and Charades with the same figure pool.",
    title: "Hat Game",
  });
}
