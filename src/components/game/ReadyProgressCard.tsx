import type { ReactNode } from "react";

/**
 * Small meta strip shown between turns — Round x/y (WWW) or Phase label (Hat).
 */
export function ReadyProgressCard({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 text-typ-ui shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 font-semibold text-foreground">{children}</div>
    </div>
  );
}
