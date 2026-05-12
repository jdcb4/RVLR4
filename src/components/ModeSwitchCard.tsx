import { Link } from "react-router-dom";

import { IconChevronRight } from "@/components/icons";

/**
 * "Switch play mode" card used on both the Multi-Device landing page and the
 * Pass-and-Play hub. Sits at the bottom of either page so the primary mode
 * keeps the prominent position above.
 */
export function ModeSwitchCard({
  ariaLabel,
  description,
  eyebrow,
  title,
  to,
}: {
  readonly ariaLabel: string;
  readonly description: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly to: string;
}) {
  return (
    <Link
      aria-label={ariaLabel}
      className="mt-8 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-semantic-primary-border hover:bg-semantic-accent-hover-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      to={to}
    >
      <div className="min-w-0 flex-1">
        <p className="text-typ-overline font-medium uppercase text-muted-foreground">
          {eyebrow}
        </p>
        <p className="mt-1 text-typ-card-title font-semibold">{title}</p>
        <p className="mt-1 text-typ-ui-snug text-muted-foreground">{description}</p>
      </div>
      <IconChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
