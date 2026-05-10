import { LandingScreenLayout } from "@/components/game/LandingScreenLayout";
import { ResumeGameCard } from "@/components/game/ResumeGameCard";
import { formatSavedAt } from "@/lib/formatSavedAt";
import type { PersistedMatch } from "@/services/whowhatwherePersistence";

/**
 * Entry screen for Who What Where — mirrors Hat Game landing layout (description + optional resume card).
 * Footer actions (Start game / Start new game / discard confirm) live in `GameShell`.
 */
export function WwwLandingScreen({
  pendingMatch,
  confirmDiscardPending,
  onResume,
}: {
  readonly pendingMatch: PersistedMatch | null;
  readonly confirmDiscardPending: boolean;
  readonly onResume: () => void;
}) {
  return (
    <LandingScreenLayout
      confirmDestructiveSlot={
        confirmDiscardPending ? (
          <p className="text-typ-ui font-medium text-destructive">
            Start a new game? This will discard the saved game on this device.
          </p>
        ) : null
      }
      resumeSlot={
        pendingMatch && !confirmDiscardPending ? (
          <ResumeGameCard
            savedAtLabel={formatSavedAt(pendingMatch.savedAt)}
            onResume={onResume}
          />
        ) : null
      }
      subtitle="Teams race to describe mystery words from categories you choose — timed turns, skips, and quick scoring on one shared phone."
      title="Who What Where"
      wrapInKeyboardSafeSection
    />
  );
}
