import { useEffect, useMemo, useRef, useState } from "react";

import { FOOTER_ACTION_LOCK_MS } from "@/components/footerActionLockContext";
import { IMPOSTER_MAX_PLAYERS, IMPOSTER_MIN_PLAYERS } from "@/config/imposterDefaults";
import { getImposterWordList } from "@/data/imposterWordList";
import {
  clampImposterCount,
  dealImposterRound,
  defaultImposterCount,
  getImposterSetupError,
  maxImpostersForPlayers,
} from "@/domain/imposter/round";
import type {
  ImposterPlayer,
  ImposterSnapshot,
  ImposterStep,
  ImposterStoragePayload,
} from "@/features/imposter/imposterAppTypes";
import { formatSavedAt } from "@/lib/formatSavedAt";
import {
  clearImposterSavedState,
  loadImposterSavedState,
  saveImposterState,
} from "@/services/imposterGameStorage";

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

const isStoragePayload = (value: unknown): value is ImposterStoragePayload =>
  Boolean(
    value &&
      typeof value === "object" &&
      "schemaVersion" in value &&
      "snapshot" in value &&
      "lastSavedAt" in value,
  );

export type ImposterAppController = ReturnType<typeof useImposterApp>;

export function useImposterApp() {
  const [snapshot, setSnapshot] = useState<ImposterSnapshot>(() =>
    createInitialSnapshot("landing"),
  );
  const [savedRecord, setSavedRecord] = useState<ImposterStoragePayload | null>(
    null,
  );
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [confirmNewGame, setConfirmNewGame] = useState(false);
  const [footerActionsLocked, setFooterActionsLocked] = useState(false);
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

  useEffect(() => {
    setFooterActionsLocked(true);
    const timeout = setTimeout(() => setFooterActionsLocked(false), FOOTER_ACTION_LOCK_MS);
    return () => clearTimeout(timeout);
  }, [actionLockKey]);

  useEffect(() => {
    if (!showInfoPopup) {
      return undefined;
    }
    const timeout = setTimeout(() => setShowInfoPopup(false), 5000);
    return () => clearTimeout(timeout);
  }, [showInfoPopup]);

  const startNewGame = async () => {
    setConfirmNewGame(false);
    setSavedRecord(null);
    setError("");
    await clearImposterSavedState();
    setSnapshot(createInitialSnapshot("settings"));
  };

  const resumeSavedGame = () => {
    if (!savedRecord) {
      return;
    }
    setConfirmNewGame(false);
    setError("");
    setSnapshot(savedRecord.snapshot);
  };

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

  const confirmSettingsNext = () => {
    const err = getImposterSetupError({
      playerCount: snapshot.playerCount,
      imposterCount: snapshot.imposterCount,
      playerNames: snapshot.players.map((p) => p.name),
    });
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
    const err = getImposterSetupError({
      playerCount: snapshot.playerCount,
      imposterCount: snapshot.imposterCount,
      playerNames: snapshot.players.map((p) => p.name),
    });
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setSnapshot((current) => ({ ...current, step: "review" }));
  };

  const confirmReviewStartRound = () => {
    const current = snapshotRef.current;
    const err = getImposterSetupError({
      playerCount: current.playerCount,
      imposterCount: current.imposterCount,
      playerNames: current.players.map((p) => p.name),
    });
    if (err) {
      setError(err);
      return;
    }
    const wordBank = getImposterWordList();
    if (wordBank.length === 0) {
      setError("No words available. Add words to the app word list.");
      return;
    }
    setError("");
    try {
      const deal = dealImposterRound({
        playerIds: current.players.map((p) => p.id),
        imposterCount: current.imposterCount,
        wordBank,
        rng: Math.random,
      });
      setSnapshot((s) => ({
        ...s,
        step: "reveal",
        round: {
          secretWord: deal.secretWord,
          imposterPlayerIds: [...deal.imposterPlayerIds],
          revealPlayerIndex: 0,
          revealRevealed: false,
        },
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start round.");
    }
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

  const goGuidePrediscussion = () =>
    setSnapshot((s) => ({ ...s, step: "guidePrediscussion" }));

  const goGuideWarning = () =>
    setSnapshot((s) => ({ ...s, step: "guideWarning" }));

  const goResults = () => setSnapshot((s) => ({ ...s, step: "results" }));

  const replaySamePlayers = () => {
    setError("");
    const current = snapshotRef.current;
    const err = getImposterSetupError({
      playerCount: current.playerCount,
      imposterCount: current.imposterCount,
      playerNames: current.players.map((p) => p.name),
    });
    if (err) {
      setError(err);
      return;
    }
    const wordBank = getImposterWordList();
    try {
      const deal = dealImposterRound({
        playerIds: current.players.map((p) => p.id),
        imposterCount: current.imposterCount,
        wordBank,
        rng: Math.random,
      });
      setSnapshot((s) => ({
        ...s,
        step: "reveal",
        round: {
          secretWord: deal.secretWord,
          imposterPlayerIds: [...deal.imposterPlayerIds],
          revealPlayerIndex: 0,
          revealRevealed: false,
        },
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not replay.");
    }
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
