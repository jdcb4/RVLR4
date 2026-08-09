import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { IMPOSTER_MAX_PLAYERS, IMPOSTER_MIN_PLAYERS } from "@/config/imposterDefaults";
import { maxImpostersForPlayers } from "@/domain/imposter/round";
import { getImposterWordList } from "@/domain/imposter/wordList";
import {
  makeSingleplayerResumeSavedGame,
  makeSingleplayerStartNewGame,
} from "@/features/game-app-hooks/singleplayerLifecycle";
import { useAutoHidePopup } from "@/features/game-app-hooks/useAutoHidePopup";
import { useFooterActionLockOnKeyChange } from "@/features/game-app-hooks/useFooterActionLockOnKeyChange";
import type { ImposterSnapshot } from "@/features/imposter/imposterSingleplayerAppTypes";
import {
  advanceImposterReveal,
  createInitialImposterSnapshot,
  moveImposterSetupForward,
  moveImposterToStep,
  resizeImposterRoster,
  returnImposterToSettings,
  setImposterCount,
  showImposterRole,
  startImposterRound,
  updateImposterPlayerName,
} from "@/features/imposter/imposterSingleplayerTransitions";
import { useImposterSingleplayerPersistence } from "@/features/imposter/useImposterSingleplayerPersistence";
import { formatSavedAt } from "@/lib/formatSavedAt";
import { clearImposterSavedState } from "@/services/imposterStorage";

import packageJson from "../../../package.json";

export { formatSavedAt };

export type ImposterSingleplayerAppController = ReturnType<typeof useImposterSingleplayerApp>;

export function useImposterSingleplayerApp() {
  const [snapshot, setSnapshot] = useState<ImposterSnapshot>(() =>
    createInitialImposterSnapshot("landing"),
  );
  const { loaded, savedRecord, setSavedRecord } = useImposterSingleplayerPersistence(snapshot);
  const [error, setError] = useState("");
  const [confirmNewGame, setConfirmNewGame] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const snapshotRef = useRef(snapshot);

  useLayoutEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const actionLockKey = [
    loaded ? "loaded" : "loading",
    snapshot.step,
    snapshot.round?.revealPlayerIndex ?? "no-reveal",
    snapshot.round?.revealRevealed ? "rev-yes" : "rev-no",
    confirmNewGame ? "confirm" : "ok",
  ].join(":");

  const footerActionsLocked = useFooterActionLockOnKeyChange(actionLockKey);
  useAutoHidePopup(showInfoPopup, () => setShowInfoPopup(false));

  const startNewGame = makeSingleplayerStartNewGame({
    clearSavedState: clearImposterSavedState,
    resetSnapshot: () => createInitialImposterSnapshot("settings"),
    setConfirmNewGame,
    setError,
    setSavedRecord,
    setSnapshot,
  });

  const resumeSavedGame = makeSingleplayerResumeSavedGame({
    savedRecord,
    setConfirmNewGame,
    setError,
    setSnapshot,
  });

  const updatePlayerCount = (count: number) => {
    if (count < IMPOSTER_MIN_PLAYERS || count > IMPOSTER_MAX_PLAYERS) {
      return;
    }
    setSnapshot((current) => resizeImposterRoster(current, count));
    setError("");
  };

  const updateImposterCount = (count: number) => {
    setSnapshot((current) => setImposterCount(current, count));
    setError("");
  };

  const startRevealRound = ({
    current,
    emptyWordBankError,
    fallbackError,
  }: {
    readonly current: ImposterSnapshot;
    readonly emptyWordBankError?: string;
    readonly fallbackError: string;
  }) => {
    const wordBank = getImposterWordList();
    const result = startImposterRound(
      current,
      wordBank,
      Math.random,
      fallbackError,
      emptyWordBankError,
    );
    if (!result.snapshot) return setError(result.error);
    setSnapshot(result.snapshot);
    setError("");
  };

  const confirmSettingsNext = () => {
    const result = moveImposterSetupForward(snapshotRef.current, "roster");
    if (!result.snapshot) return setError(result.error);
    setSnapshot(result.snapshot);
    setError("");
  };

  const updatePlayerName = (playerId: string, name: string) => {
    setSnapshot((current) => updateImposterPlayerName(current, playerId, name));
    setError("");
  };

  const confirmRosterNext = () => {
    const result = moveImposterSetupForward(snapshotRef.current, "review");
    if (!result.snapshot) return setError(result.error);
    setSnapshot(result.snapshot);
    setError("");
  };

  const confirmReviewStartRound = () => {
    startRevealRound({
      current: snapshotRef.current,
      emptyWordBankError: "No words available. Add words to the app word list.",
      fallbackError: "Could not start round.",
    });
  };

  const revealShowRole = () => {
    setSnapshot(showImposterRole);
    setError("");
  };

  const revealConfirmNext = () => {
    setSnapshot(advanceImposterReveal);
    setError("");
  };

  const goGuidePrediscussion = () =>
    setSnapshot((current) => moveImposterToStep(current, "guidePrediscussion"));

  const goGuideWarning = () =>
    setSnapshot((current) => moveImposterToStep(current, "guideWarning"));

  const goResults = () => setSnapshot((current) => moveImposterToStep(current, "results"));

  const replaySamePlayers = () => {
    startRevealRound({
      current: snapshotRef.current,
      fallbackError: "Could not replay.",
    });
  };

  const newGameKeepGameType = () => {
    void clearImposterSavedState();
    setSavedRecord(null);
    setError("");
    setSnapshot(createInitialImposterSnapshot("settings"));
  };

  const backToSettings = () => {
    setError("");
    setSnapshot(returnImposterToSettings);
  };

  const backToRoster = () => {
    setError("");
    setSnapshot((current) => moveImposterToStep(current, "roster"));
  };

  const maxImposters = useMemo(
    () => maxImpostersForPlayers(snapshot.playerCount),
    [snapshot.playerCount],
  );

  return {
    snapshot,
    savedRecord,
    loaded,
    error,
    confirmNewGame,
    setConfirmNewGame,
    footerActionsLocked,
    showInfoPopup,
    setShowInfoPopup,
    appVersion: packageJson.version as string,
    maxImposters,
    startNewGame,
    resumeSavedGame,
    updatePlayerCount,
    updateImposterCount,
    confirmSettingsNext,
    updatePlayerName,
    confirmRosterNext,
    confirmReviewStartRound,
    revealShowRole,
    revealConfirmNext,
    goGuidePrediscussion,
    goGuideWarning,
    goResults,
    replaySamePlayers,
    newGameKeepGameType,
    backToSettings,
    backToRoster,
    setError,
  };
}
