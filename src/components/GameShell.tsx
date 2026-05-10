import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { IconHouse } from "@/components/icons";
import { cn } from "@/lib/utils";
import { typography } from "@/typography/tiers";

/**
 * Shared mobile-first layout: safe areas, scrollable middle, optional sticky footer
 * with extra padding so on-screen keyboards do not cover primary actions.
 */
export function GameShell({
  title,
  headerRight,
  children,
  footer,
}: {
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="safe-screen mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between gap-2 border-b border-semantic-border-muted py-3">
          <Link
            aria-label="Back to game picker"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-accent"
            to="/"
          >
            <IconHouse className="size-5" />
          </Link>
          <h1
            className={cn(
              typography.shellTitle,
              "min-w-0 flex-1 text-center font-semibold",
            )}
          >
            {title}
          </h1>
          <div className="flex min-h-10 min-w-[2.5rem] items-center justify-end gap-1">
            {headerRight}
          </div>
        </header>

        <div className="keyboard-safe-form flex min-h-0 flex-1 flex-col py-4">
          {children}
        </div>

        {footer ? (
          <footer className="sticky bottom-0 z-20 border-t border-border bg-semantic-surface-elevated py-3 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
