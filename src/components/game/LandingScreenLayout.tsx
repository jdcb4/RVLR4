import type { ReactNode } from "react";

import { GamePanel } from "@/components/game/GamePanel";

export type LandingScreenLayoutProps = {
  readonly title: string;
  readonly subtitle: string;
  /** Shown when a save exists and the user has not chosen to replace it (e.g. `ResumeGameCard`). */
  readonly resumeSlot?: ReactNode;
  /** Shown when confirming discarding the save (destructive copy). */
  readonly confirmDestructiveSlot?: ReactNode;
  /**
   * WWW wraps landing in a keyboard-friendly outer section; Hat uses the panel only so the shell
   * matches existing spacing — keep false for Hat unless we intentionally align shell padding.
   */
  readonly wrapInKeyboardSafeSection?: boolean;
};

/**
 * Shared **Game picker–style** landing shell for Who What Where and Hat Game (title, blurb, resume / confirm slots).
 */
export function LandingScreenLayout({
  title,
  subtitle,
  resumeSlot,
  confirmDestructiveSlot,
  wrapInKeyboardSafeSection = false,
}: LandingScreenLayoutProps) {
  const panel = (
    <GamePanel subtitle={subtitle} title={title}>
      {resumeSlot}
      {confirmDestructiveSlot}
    </GamePanel>
  );

  if (wrapInKeyboardSafeSection) {
    return (
      <section className="keyboard-safe-form flex flex-1 flex-col pb-4">
        {panel}
      </section>
    );
  }

  return panel;
}
