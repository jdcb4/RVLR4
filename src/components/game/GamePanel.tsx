import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { typography } from "@/typography/tiers";

/**
 * Shared “card” chrome for in-game panels (Hat Game + WhoWhatWhere).
 * Prefer wrapping each game screen’s primary content in `GamePanel` for consistent borders and typography (see `docs/ARCHITECTURE.md`).
 */
export function GamePanel({
  title,
  subtitle,
  eyebrow,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children?: ReactNode;
  /** Merged onto the outer card — use for flex/min-height layouts (e.g. team roster). */
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div>
        {eyebrow ? (
          <p className={cn(typography.ui, "text-muted-foreground")}>{eyebrow}</p>
        ) : null}
        <h2 className={cn(typography.panelTitle, "font-semibold")}>{title}</h2>
        {subtitle ? (
          <p className={cn(typography.ui, "mt-1 text-muted-foreground")}>
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="grid gap-4">{children}</div>
    </div>
  );
}
