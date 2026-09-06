import { useEffect, useMemo, useState } from "react";

import { FOOTER_ACTION_LOCK_MS } from "@/components/footerActionLockContext";
import {
  correctWord,
  endTurn,
  returnSkippedWord,
  revealHint,
  showResults,
  skipWord,
  startTurn,
} from "@/domain/whowhatwhere/game";
import { reconcileTeamSetups } from "@/domain/whowhatwhere/setup";
import type { GameSettings, MatchState, TeamSetup } from "@/domain/whowhatwhere/types";
import { useWhoWhatWherePersistence } from "@/features/whowhatwhere/useWhoWhatWherePersistence";
import { useWhoWhatWhereTurnTicker } from "@/features/whowhatwhere/useWhoWhatWhereTurnTicker";
import {
  createValidatedWhoWhatWhereMatch,
  nextWhoWhatWhereTeamStep,
  restoreWhoWhatWhereMatch,
  type WhoWhatWhereAppMode,
} from "@/features/whowhatwhere/whoWhatWhereSingleplayerTransitions";
import { playGameSoundEffect } from "@/services/gameSoundEffects";
import {
  clearMatch,
  loadMatch,
  loadSetup,
  type PersistedMatch,
} from "@/services/whowhatwherePersistence";

export function useWhoWhatWhereSingleplayerApp() {
  const initialSetup = useMemo(() => loadSetup(), []);
  const [settings, setSettings] = useState(initialSetup.settings);
  const [teamSetups, setTeamSetups] = useState(initialSetup.teams);
  const [teamStep, setTeamStep] = useState(0);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [mode, setMode] = useState<WhoWhatWhereAppMode>("landing");
  const [pendingMatch, setPendingMatch] = useState<PersistedMatch | null>(() => loadMatch());
  const [confirmDiscardPending, setConfirmDiscardPending] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [turnError, setTurnError] = useState("");
  const [isStartingTurn, setIsStartingTurn] = useState(false);
  const [footerActionsLocked, setFooterActionsLocked] = useState(false);
  const [readyHandoffRevealed, setReadyHandoffRevealed] = useState(false);

  useWhoWhatWherePersistence(settings, teamSetups, match);
  useWhoWhatWhereTurnTicker(match, setMatch);

  const activeMode: WhoWhatWhereAppMode = match
    ? match.stage === "ready"
      ? "ready"
      : match.stage
    : mode;

  useEffect(() => {
    setReadyHandoffRevealed(false);
  }, [match?.roundNumber, match?.teamIndex, match?.stage]);

  const actionLockKey = [
    pendingMatch ? "pending" : "idle",
    confirmDiscardPending ? "confirm-discard" : "no-confirm",
    activeMode,
    teamStep,
    match?.roundNumber ?? "-",
    match?.teamIndex ?? "-",
    readyHandoffRevealed ? "go" : "pass",
    match?.activeTurn?.startedAt ?? "no-turn",
  ].join(":");

  useEffect(() => {
    setFooterActionsLocked(true);
    const timeout = window.setTimeout(() => setFooterActionsLocked(false), FOOTER_ACTION_LOCK_MS);
    return () => window.clearTimeout(timeout);
  }, [actionLockKey]);

  const updateSettings = (nextSettings: GameSettings) => {
    setSettings(nextSettings);
    setTeamSetups((currentTeams) => reconcileTeamSetups(currentTeams, nextSettings.teamCount));
  };

  const goToSettingsFromLanding = () => {
    setConfirmDiscardPending(false);
    setMode("settings");
  };

  const goToTeamSetup = () => {
    setSetupError("");
    setTeamSetups((currentTeams) => reconcileTeamSetups(currentTeams, settings.teamCount));
    setTeamStep(0);
    setMode("team");
  };

  const goBackFromTeamSetup = () => {
    setSetupError("");
    if (teamStep === 0) {
      setMode("settings");
    } else {
      setTeamStep((currentStep) => currentStep - 1);
    }
  };

  const advanceTeamSetup = () => {
    setSetupError("");
    const next = nextWhoWhatWhereTeamStep(teamStep, settings.teamCount);
    setTeamStep(next.step);
    setMode(next.mode);
  };

  const startNewMatch = () => {
    const result = createValidatedWhoWhatWhereMatch(teamSetups, settings);
    if (!result.match) return setSetupError(result.error);
    clearMatch();
    setMatch(result.match);
    setSetupError("");
  };

  const startRoundFromReview = () => {
    startNewMatch();
  };

  const leaveReviewToTeamSetup = () => {
    setSetupError("");
    setMode("team");
    setTeamStep(Math.max(0, settings.teamCount - 1));
  };

  const startNextTurn = async () => {
    setTurnError("");
    setIsStartingTurn(true);

    try {
      const { getWhoWhatWhereWordList } = await import("@/domain/whowhatwhere/wordList");

      setMatch((currentMatch) =>
        currentMatch ? startTurn(currentMatch, getWhoWhatWhereWordList()) : currentMatch,
      );
    } catch (error) {
      setTurnError(error instanceof Error ? error.message : "Unable to start this turn.");
    } finally {
      setIsStartingTurn(false);
    }
  };

  const resumePendingMatch = () => {
    if (!pendingMatch) {
      return;
    }

    setMatch(restoreWhoWhatWhereMatch(pendingMatch));
    setPendingMatch(null);
    setConfirmDiscardPending(false);
  };

  const startOverFromPendingMatch = () => {
    clearMatch();
    setMatch(null);
    setPendingMatch(null);
    setMode("landing");
    setConfirmDiscardPending(false);
  };

  const backToSetup = () => {
    clearMatch();
    setMatch(null);
    setMode("landing");
  };

  /**
   * "Play again" entry point from final results — clears the finished match
   * and lands on the settings screen with the user's previous prefs intact, so
   * they can tweak teams / categories before starting the next match.
   */
  const playAgainFromSettings = () => {
    clearMatch();
    setMatch(null);
    setMode("settings");
  };

  const playAgain = () => {
    const result = createValidatedWhoWhatWhereMatch(teamSetups, settings);
    if (result.match) setMatch(result.match);
  };

  return {
    activeMode,
    settings,
    teamSetups,
    teamStep,
    match,
    pendingMatch,
    confirmDiscardPending,
    setConfirmDiscardPending,
    setupError,
    turnError,
    isStartingTurn,
    footerActionsLocked,
    readyHandoffRevealed,
    setReadyHandoffRevealed,
    setTeamSetups: setTeamSetups as (teams: TeamSetup[]) => void,
    updateSettings,
    goToSettingsFromLanding,
    goToTeamSetup,
    goBackFromTeamSetup,
    advanceTeamSetup,
    leaveReviewToTeamSetup,
    startRoundFromReview,
    resumePendingMatch,
    startOverFromPendingMatch,
    startNextTurn,
    backToSetup,
    playAgain,
    playAgainFromSettings,
    correct: () => {
      void playGameSoundEffect("correct");
      setMatch((currentMatch) => (currentMatch ? correctWord(currentMatch) : currentMatch));
    },
    skip: () => {
      void playGameSoundEffect("skip");
      setMatch((currentMatch) => (currentMatch ? skipWord(currentMatch) : currentMatch));
    },
    returnSkipped: (skippedWordId: string) => {
      void playGameSoundEffect("returnSkipped");
      setMatch((currentMatch) =>
        currentMatch ? returnSkippedWord(currentMatch, skippedWordId) : currentMatch,
      );
    },
    revealHint: () => {
      setMatch((currentMatch) => (currentMatch ? revealHint(currentMatch) : currentMatch));
    },
    endTurn: () => {
      void playGameSoundEffect("timeout");
      setMatch((currentMatch) => (currentMatch ? endTurn(currentMatch) : currentMatch));
    },
    viewResults: () => {
      void playGameSoundEffect("victory");
      setMatch((currentMatch) => (currentMatch ? showResults(currentMatch) : currentMatch));
    },
  };
}

export type WhoWhatWhereSingleplayerController = ReturnType<typeof useWhoWhatWhereSingleplayerApp>;
