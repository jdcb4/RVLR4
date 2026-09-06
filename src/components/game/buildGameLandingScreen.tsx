import type { ReactNode } from "react";

import { PrimaryFooterButton, SecondaryFooterButton } from "@/components/game/GameFooterButtons";
import { LandingScreenLayout } from "@/components/game/LandingScreenLayout";
import { ResumeGameCard } from "@/components/game/ResumeGameCard";
import { formatSavedAt } from "@/lib/formatSavedAt";

/**
 * Minimal controller surface that every pass-and-play landing screen needs.
 * Game-specific controllers (Hat, Imposter, …) already satisfy this shape
 * — they each expose a `confirmNewGame` flag, `savedRecord` (or null), and
 * the three transitions below.
 */
export type LandingScreenController = {
  readonly confirmNewGame: boolean;
  readonly savedRecord: { readonly lastSavedAt: string } | null;
  readonly setConfirmNewGame: (value: boolean) => void;
  readonly startNewGame: () => void | Promise<void>;
  readonly resumeSavedGame: () => void;
};

/**
 * Builds the shared `{ content, actions }` shape for a pass-and-play landing
 * screen — title, subtitle, resume card when a save exists, and the standard
 * Start / Discard-confirm footer state machine. Hat and Imposter both call
 * this; their per-screen modules just supply the copy + their controller.
 */
export function buildGameLandingScreen({
  controller,
  subtitle,
  title,
}: {
  readonly controller: LandingScreenController;
  readonly subtitle: string;
  readonly title: string;
}): { content: ReactNode; actions: ReactNode } {
  const content = (
    <LandingScreenLayout
      confirmDestructiveSlot={
        controller.confirmNewGame ? (
          <p className="font-medium text-typ-ui text-destructive">
            Start a new game? This will discard the saved game on this device.
          </p>
        ) : null
      }
      resumeSlot={
        controller.savedRecord && !controller.confirmNewGame ? (
          <ResumeGameCard
            savedAtLabel={formatSavedAt(controller.savedRecord.lastSavedAt)}
            onResume={controller.resumeSavedGame}
          />
        ) : null
      }
      subtitle={subtitle}
      title={title}
    />
  );

  const actions = controller.confirmNewGame ? (
    <>
      <SecondaryFooterButton label="Cancel" onClick={() => controller.setConfirmNewGame(false)} />
      <PrimaryFooterButton
        label="Discard saved game"
        onClick={() => void controller.startNewGame()}
      />
    </>
  ) : controller.savedRecord ? (
    <PrimaryFooterButton
      label="Start new game"
      onClick={() => controller.setConfirmNewGame(true)}
    />
  ) : (
    <PrimaryFooterButton label="Start game" onClick={() => void controller.startNewGame()} />
  );

  return { content, actions };
}
