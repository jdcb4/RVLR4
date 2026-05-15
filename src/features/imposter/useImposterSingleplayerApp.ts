import { useEffect, useMemo, useRef, useState } from "react";

import { IMPOSTER_MAX_PLAYERS, IMPOSTER_MIN_PLAYERS } from "@/config/imposterDefaults";
import { getImposterWordList } from "@/data/imposterWordList";
import {
  clampImposterCount,
  defaultImposterCount,
  maxImpostersForPlayers,
} from "@/domain/imposter/round";
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
  ImposterPlayer,
  ImposterRoundState,
  ImposterSnapshot,
  ImposterStep,
  ImposterStoragePayload,
} from "@/features/imposter/imposterSingleplayerAppTypes";
import { formatSavedAt } from "@/lib/formatSavedAt";
import {
  clearImposterSavedState,
  loadImposterSavedState,
  saveImposterState,
} from "@/services/imposterStorage";

import packageJson from "../../../package.json";

export { formatSavedAt };

const createPlayersForCount = (
  count: number,
  previous: readonly ImposterPlayer[],
): ImposterPlayer[] =>
  Array.from({ length: count }, (_, index) => ({
    id: previous[index]?.id ?? `imposter-player-${index + 1}`,
    name: previous[index]?.name ?? `Player ${index + 1}`,
  }));

const createInitialSnapshot = (step: ImposterStep = "landing"): ImposterSnapshot => ({
  step,
  playerCount: 6,
  imposterCount: defaultImposterCount(6),
  players: createPlayersForCount(6, []),
  round: null,
});

const startRevealStep = (
  snapshot: ImposterSnapshot,
  round: ImposterRoundState,
): ImposterSnapshot => ({
  ...snapshot,
  step: "reveal",
  round,
});

const isStoragePayload = (value: unknown): value is ImposterStoragePayload =>
  Boolean(
    value &&
    typeof value === "object" &&
    "schemaVersion" in value &&
    "snapshot" in value &&
    "lastSavedAt" in value,
  );

export type ImposterSingleplayerAppController = ReturnType<typeof useImposterSingleplayerApp>;

export function useImposterSingleplayerApp() {
  const [snapshot, setSnapshot] = useState<ImposterSnapshot>(() =>
    createInitialSnapshot("landing"),
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
    void loadImposterSavedState<ImposterStoragePayload | ImposterSnapshot>()
      .then((saved) => {
        if (!saved) {
          return;
        }
        const record = isStoragePayload(saved)
          ? saved
          : {
              schemaVersion: 1 as const,
              lastSavedAt: new Date().toISOString(),
              snapshot: saved,
            };
        if (record.snapshot.step === "results") {
          void clearImposterSavedState();
          return;
        }
        setSavedRecord(record);
      })
      .finally(() => {
        setLoaded(true);
      });
  }, []);

  const persistSnapshot = async (nextSnapshot: ImposterSnapshot) => {
    if (nextSnapshot.step === "landing") {
      return null;
    }
    if (nextSnapshot.step === "results") {
      setSavedRecord(null);
      await clearImposterSavedState();
      return null;
    }
    const record: ImposterStoragePayload = {
      schemaVersion: 1,
      lastSavedAt: new Date().toISOString(),
      snapshot: nextSnapshot,
    };
    setSavedRecord(record);
    await saveImposterState(record);
    return record;
  };

  useEffect(() => {
    if (loaded && snapshot.step !== "landing") {
      void persistSnapshot(snapshot);
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
    resetSnapshot: () => createInitialSnapshot("settings"),
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
        players: createPlayersForCount(count, current.players),
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
      setSnapshot((s) => startRevealStep(s, round));
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
      players: createPlayersForCount(current.playerCount, current.players),
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
    setSnapshot((current) => {
      if (!current.round) {
        return current;
      }
      return {
        ...current,
        round: { ...current.round, revealRevealed: true },
      };
    });
    setError("");
  };

  const revealConfirmNext = () => {
    const current = snapshotRef.current;
    if (!current.round?.revealRevealed) {
      return;
    }
    const lastIndex = current.players.length - 1;
    if (current.round.revealPlayerIndex >= lastIndex) {
      setSnapshot((s) => ({
        ...s,
        step: "guidePregame",
      }));
      return;
    }
    setSnapshot((s) => {
      if (!s.round) {
        return s;
      }
      return {
        ...s,
        round: {
          ...s.round,
          revealPlayerIndex: s.round.revealPlayerIndex + 1,
          revealRevealed: false,
        },
      };
    });
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
    setSnapshot(createInitialSnapshot("settings"));
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
