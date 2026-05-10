import { GamePanel } from "@/components/game/GamePanel";
import { reviewDisplayRowsFromWww } from "@/components/game/reviewTeamMappers";
import { ReviewTeamsPanel } from "@/components/game/ReviewTeamsPanel";
import type { TeamSetup } from "@/domain/whowhatwhere/types";

/**
 * Post-roster, pre-round checkpoint — aligned with Hat Game “Review teams” layout.
 */
export function WwwReviewTeamsScreen({
  teams,
}: {
  readonly teams: readonly TeamSetup[];
}) {
  const rows = reviewDisplayRowsFromWww(teams);

  return (
    <section className="keyboard-safe-form flex flex-1 flex-col gap-4 pb-4">
      <GamePanel title="Review teams">
        <ReviewTeamsPanel teams={rows} />
      </GamePanel>

      <GamePanel
        subtitle="Round flow"
        title="Next steps"
      >
        <p className="text-typ-body text-muted-foreground">
          After you start the round, pass the phone to the first describer — they will tap
          when ready so others can look away before the timer.
        </p>
      </GamePanel>
    </section>
  );
}
