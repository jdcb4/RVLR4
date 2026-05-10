import { Button } from "@/components/ui/button";

/**
 * In-card resume affordance (not the shell footer primary).
 * Pair with a footer whose primary is “Start new game”.
 */
export function ResumeGameCard({
  savedAtLabel,
  onResume,
}: {
  readonly savedAtLabel: string;
  readonly onResume: () => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="font-semibold text-typ-ui">Game in progress</p>
      <p className="text-typ-ui text-muted-foreground">
        Saved {savedAtLabel}. Continue where you left off.
      </p>
      <Button className="h-11 w-full" type="button" variant="outline" onClick={onResume}>
        Resume game
      </Button>
    </div>
  );
}
