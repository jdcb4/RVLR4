import { useEffect, useMemo, useRef, useState } from "react";

import { IMPOSTER_MAX_PLAYERS, IMPOSTER_MIN_PLAYERS } from "@/config/imposterDefaults";
import {
  clampImposterCount,
  defaultImposterCount,
  maxImpostersForPlayers,
} from "@/domain/imposter/round";
import { getImposterWordList } from "@/domain/imposter/wordList";
import {
  makeSingleplayerResumeSavedGame,
  makeSingleplayerStartNewGame,
} from "@/features/game-app-hooks/singleplayerLifecycle";
import { useAutoHidePopup } from "@/features/game-app-hooks/useAutoHidePopup";
import { useFooterActionLockOnKeyChange } from "@/features/game-app-hooks/useFooterActionLockOnKeyChange";
import {
  createImposterRevealRound,
  validateImposterSnapshotSetup,
} from "@/features/imposter/imposterRoundFlow";
import type {
  ImposterSnapshot,
  ImposterStoragePayload,
} from "@/features/imposter/imposterSingleplayerAppTypes";
import {
  loadImposterResumeRecord,
  persistImposterSnapshot,
} from "@/features/imposter/imposterSingleplayerPersistence";
import {
  advanceImposterReveal,
  createImposterPlayers,
  createInitialImposterSnapshot,
  showImposterRole,
  startImposterReveal,
} from "@/features/imposter/imposterSingleplayerTransitions";
import { formatSavedAt } from "@/lib/formatSavedAt";
import { clearImposterSavedState } from "@/services/imposterStorage";

import packageJson from "../../../package.json";

export { formatSavedAt };

export type ImposterSingleplayerAppController = ReturnType<typeof useImposterSingleplayerApp>;

export function useImposterSingleplayerApp() {
  const [snapshot, setSnapshot] = useState<ImposterSnapshot>(() =>
    createInitialImposterSnapshot("landing"),
  );
  const [savedRecord, setSavedRecord] = useState<ImposterStoragePayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [confirmNewGame, setConfirmNewGame] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    void loadImposterResumeRecord()
      .then(setSavedRecord)
      .finally(() => {
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (loaded && snapshot.step !== "landing") {
      void persistImposterSnapshot(snapshot).then(setSavedRecord);
    }
  }, [loaded, snapshot]);

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
    setSnapshot((current) => {
      const nextDefault = defaultImposterCount(count);
      const imposterCount = clampImposterCount(count, nextDefault);
      return {
        ...current,
        playerCount: count,
        imposterCount,
        players: createImposterPlayers(count, current.players),
        round: null,
      };
    });
    setError("");
  };

  const updateImposterCount = (count: number) => {
    setSnapshot((current) => {
      const safe = clampImposterCount(current.playerCount, count);
      return { ...current, imposterCount: safe, round: null };
    });
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
    const err = validateImposterSnapshotSetup(current);
    if (err) {
      setError(err);
      return;
    }
    const wordBank = getImposterWordList();
    if (emptyWordBankError && wordBank.length === 0) {
      setError(emptyWordBankError);
      return;
    }
    setError("");
    try {
      const round = createImposterRevealRound({
        snapshot: current,
        wordBank,
        rng: Math.random,
      });
      setSnapshot((s) => startImposterReveal(s, round));
    } catch (e) {
      setError(e instanceof Error ? e.message : fallbackError);
    }
  };

  const confirmSettingsNext = () => {
    const err = validateImposterSnapshotSetup(snapshot);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setSnapshot((current) => ({
      ...current,
      step: "roster",
      players: createImposterPlayers(current.playerCount, current.players),
    }));
  };

  const updatePlayerName = (playerId: string, name: string) => {
    setSnapshot((current) => ({
      ...current,
      players: current.players.map((player) =>
        player.id === playerId ? { ...player, name } : player,
      ),
    }));
    setError("");
  };

  const confirmRosterNext = () => {
    const err = validateImposterSnapshotSetup(snapshot);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setSnapshot((current) => ({ ...current, step: "review" }));
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

  const goGuidePrediscussion = () => setSnapshot((s) => ({ ...s, step: "guidePrediscussion" }));

  const goGuideWarning = () => setSnapshot((s) => ({ ...s, step: "guideWarning" }));

  const goResults = () => setSnapshot((s) => ({ ...s, step: "results" }));

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
    setSnapshot((current) => ({ ...current, step: "settings", round: null }));
  };

  const backToRoster = () => {
    setError("");
    setSnapshot((current) => ({ ...current, step: "roster" }));
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
