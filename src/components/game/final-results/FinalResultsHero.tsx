import { cn } from "@/lib/utils";

/**
 * Winner callout at the top of final results — tie vs solo champion.
 */
export function FinalResultsHero({
  headline,
  subline,
  isTie,
}: {
  readonly headline: string;
  readonly subline?: string;
  readonly isTie: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-dashed px-4 py-8 text-center shadow-sm",
        "border-semantic-primary-border bg-gradient-to-br from-semantic-primary-soft-bg via-background to-accent/10",
      )}
      role="status"
      aria-label={isTie ? "Match ended in a tie" : "Match winner"}
    >
      <p className="text-typ-overline font-semibold uppercase tracking-wide text-muted-foreground">
        {isTie ? "Shared victory" : "Champion"}
      </p>
      <p className="mt-3 text-typ-display font-bold tracking-tight text-foreground">
        {headline}
      </p>
      {subline ? (
        <p className="mt-2 text-typ-body text-muted-foreground">{subline}</p>
      ) : null}
    </div>
  );
}
