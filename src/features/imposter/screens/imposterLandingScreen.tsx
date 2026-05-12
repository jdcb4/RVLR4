import { buildGameLandingScreen } from "@/components/game/buildGameLandingScreen";
import type { ScreenModel } from "@/features/imposter/imposterSingleplayerAppTypes";
import type { ImposterSingleplayerAppController } from "@/features/imposter/useImposterSingleplayerApp";

export function imposterLandingScreen(
  controller: ImposterSingleplayerAppController,
): ScreenModel {
  return buildGameLandingScreen({
    controller,
    subtitle:
      "Most players share one secret word in their heads — imposters try to blend in. Pass one phone around the table; this app deals roles and keeps everyone on the same beat.",
    title: "Imposter",
  });
}
