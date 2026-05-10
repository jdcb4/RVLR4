import { FinalBestTurnBlock } from "@/components/game/final-results/FinalBestTurnBlock";
import { FinalLeaderboardBlock } from "@/components/game/final-results/FinalLeaderboardBlock";
import { FinalResultsHero } from "@/components/game/final-results/FinalResultsHero";
import type { FinalResultsViewModel } from "@/components/game/final-results/viewModel";

/** Shared layout: hero → leaderboard → best turn (matches WWW + Hat). */
export function FinalResultsBody({ vm }: { readonly vm: FinalResultsViewModel }) {
  return (
    <>
      <FinalResultsHero
        headline={vm.heroHeadline}
        isTie={vm.isTie}
        {...(vm.heroSubline !== undefined ? { subline: vm.heroSubline } : {})}
      />
      <FinalLeaderboardBlock rows={vm.leaderboardRows} />
      <FinalBestTurnBlock bestTurn={vm.bestTurn} />
    </>
  );
}
