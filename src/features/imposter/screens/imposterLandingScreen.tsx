import { buildGameLandingScreen } from "@/components/game/buildGameLandingScreen";
import type { ScreenModel } from "@/features/imposter/imposterAppTypes";
import type { ImposterAppController } from "@/features/imposter/useImposterApp";

export function imposterLandingScreen(
  controller: ImposterAppController,
): ScreenModel {
  return buildGameLandingScreen({
    controller,
    subtitle:
      "Most players share one secret word in their heads — imposters try to blend in. Pass one phone around the table; this app deals roles and keeps everyone on the same beat.",
    title: "Imposter",
  });
}
