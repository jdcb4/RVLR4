import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { IconHouse } from "@/components/icons";
import { buttonVariants } from "@/components/ui/buttonVariants";
import { useVisualViewportHeight } from "@/components/useVisualViewportHeight";
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
  onHome,
  compact = false,
}: {
  title: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onHome?: () => void;
  compact?: boolean;
}) {
  const visualViewportHeight = useVisualViewportHeight();

  return (
    <div
      className="h-dvh overflow-hidden bg-background text-foreground"
      data-visual-viewport={visualViewportHeight === null ? "unavailable" : "active"}
      style={visualViewportHeight === null ? undefined : { height: `${visualViewportHeight}px` }}
    >
      <div className="safe-screen mx-auto flex h-full w-full max-w-md flex-col pb-[env(safe-area-inset-bottom)] pt-[max(0.5rem,env(safe-area-inset-top))]">
        <header
          className={cn(
            "flex items-center justify-between gap-2 border-b border-semantic-border-muted",
            compact ? "py-1" : "py-3",
          )}
        >
          <Link
            aria-label="Back to game picker"
            data-ui-button="secondary"
            className={cn(
              buttonVariants({ variant: "secondary", size: "icon" }),
              "shrink-0 rounded-full",
            )}
            to="/"
            onClick={(event) => {
              if (onHome) {
                event.preventDefault();
                onHome();
              }
            }}
          >
            <IconHouse className="size-5" />
          </Link>
          <h1
            className={cn(
              compact ? "text-typ-ui" : typography.shellTitle,
              "min-w-0 flex-1 text-center font-semibold",
            )}
          >
            {title}
          </h1>
          <div className="flex min-h-10 min-w-[2.5rem] items-center justify-end gap-1">
            {headerRight}
          </div>
        </header>

        <main
          className={cn(
            "keyboard-safe-form flex min-h-0 flex-1 touch-pan-y flex-col overflow-x-hidden overflow-y-auto",
            compact ? "py-2" : "py-4",
          )}
        >
          {children}
        </main>

        {footer ? (
          <footer
            className={cn(
              "z-20 shrink-0 border-t border-border bg-semantic-surface-elevated",
              compact ? "py-2" : "py-3",
            )}
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
