import { useEffect, useState, useSyncExternalStore } from "react";

import { useFooterActionLockOnKeyChange } from "@/features/game-app-hooks/useFooterActionLockOnKeyChange";
import { WhoWhatWhereDeviceController } from "@/features/whowhatwhere/whoWhatWhereDeviceController";
import type { WhoWhatWhereAppMode } from "@/features/whowhatwhere/whoWhatWhereSingleplayerTransitions";
import type { PersistedMatch } from "@/services/whowhatwherePersistence";

export function useWhoWhatWhereSingleplayerApp() {
  const [controller] = useState(() => new WhoWhatWhereDeviceController());
  const view = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [confirmDiscardPending, setConfirmDiscardPending] = useState(false);
  const { session } = view;
  const { match } = session;
  const activeMode: WhoWhatWhereAppMode = match?.stage ?? session.mode;

  useEffect(() => controller.mount(), [controller]);

  const actionLock = useFooterActionLockOnKeyChange(
    [
      activeMode,
      session.teamStep,
      match?.roundNumber,
      match?.teamIndex,
      match?.activeTurn?.startedAt,
      session.paused,
      session.presentationStage,
      view.savedGameAvailable,
    ].join(":"),
  );

  return {
    activeMode,
    settings: session.setup.settings,
    teamSetups: session.setup.teams,
    teamStep: session.teamStep,
    match,
    // Whole-device sessions restore their exact screen behind an explicit resume cover.
    pendingMatch: null as PersistedMatch | null,
    savedGameAvailable: view.savedGameAvailable,
    savedAt: session.savedAt,
    presentationStage: session.presentationStage ?? null,
    confirmDiscardPending,
    setConfirmDiscardPending,
    setupError: view.setupError,
    turnError: view.turnError,
    loaded: view.loaded,
    paused: session.paused,
    saving: view.saving,
    storageError: view.storageError,
    hydrationFailed: view.hydrationFailed,
    storageNotice: view.notice,
    secondsRemaining: Math.ceil((session.remainingMs ?? 0) / 1000),
    isStartingTurn: view.saving,
    footerActionsLocked: actionLock || view.saving || !view.loaded,
    setTeamSetups: controller.setTeamSetups,
    updateSettings: controller.updateSettings,
    goToSettingsFromLanding: controller.goToSettingsFromLanding,
    goToTeamSetup: controller.goToTeamSetup,
    goBackFromTeamSetup: controller.goBackFromTeamSetup,
    advanceTeamSetup: controller.advanceTeamSetup,
    leaveReviewToTeamSetup: controller.leaveReviewToTeamSetup,
    startRoundFromReview: controller.startNewMatch,
    resumePendingMatch: controller.openSavedGame,
    startOverFromPendingMatch: async () => {
      await controller.startOverFromPendingMatch();
      if (!controller.getSnapshot().storageError && !controller.getSnapshot().session.match)
        setConfirmDiscardPending(false);
    },
    startNextTurn: controller.startNextTurn,
    backToSetup: controller.backToSetup,
    playAgain: controller.startNewMatch,
    playAgainFromSettings: controller.playAgainFromSettings,
    correct: controller.correct,
    skip: controller.skip,
    returnSkipped: controller.returnSkipped,
    revealHint: controller.revealHint,
    endTurn: controller.endTurn,
    endPausedTurn: controller.endPausedTurn,
    viewResults: controller.viewResults,
    advanceTurnRecap: controller.advanceTurnRecap,
    continueAfterRound: controller.continueAfterRound,
    pauseGame: controller.pauseGame,
    resumeGame: controller.resumeGame,
    retrySave: controller.retrySave,
    discardUnavailableSave: async () => {
      await controller.discardUnavailableSave();
      if (!controller.getSnapshot().storageError) setConfirmDiscardPending(false);
    },
    leaveGame: controller.leaveGame,
    goBack: controller.goBack,
  };
}

export type WhoWhatWhereSingleplayerController = ReturnType<typeof useWhoWhatWhereSingleplayerApp>;
