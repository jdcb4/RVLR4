import { useEffect, useMemo, useRef, useState } from "react";

import { GAME_DEFAULTS } from "@/config/hatDefaults";
import { getHatClueSuggestions } from "@/domain/hat-game/clueSuggestions";
import { applyHatGameAction } from "@/domain/hat-game/engine";
import {
  addPlayerToHatTeam,
  applyRosterRowsToHat,
  type HatRosterTeamRow,
  hatStateToRosterRows,
  removePlayerFromHatTeam,
} from "@/domain/hat-game/setup";
import type { HatGameAction } from "@/domain/hat-game/types";
import {
  makeSingleplayerResumeSavedGame,
  makeSingleplayerStartNewGame,
} from "@/features/game-app-hooks/singleplayerLifecycle";
import { useAutoHidePopup } from "@/features/game-app-hooks/useAutoHidePopup";
import { useFooterActionLockOnKeyChange } from "@/features/game-app-hooks/useFooterActionLockOnKeyChange";
import { playHatActionSoundEffects } from "@/features/hat-game/hatActionSound";
import type { AppSnapshot, StoragePayload } from "@/features/hat-game/hatSingleplayerAppTypes";
import {
  advanceHatClueEntry,
  advanceHatTeamStep,
  applyHatRosterTransition,
  backHatTeamStep,
  beginHatClueEntry,
  createHatTeamSetup,
  createInitialHatSnapshot,
  normalizeHatSnapshot,
  startHatSession,
} from "@/features/hat-game/hatSingleplayerTransitions";
import { useHatTurnLifecycle } from "@/features/hat-game/useHatTurnLifecycle";
import { playSoundCue } from "@/services/hatSound";
import { clearSavedState, loadSavedState, saveState } from "@/services/hatStorage";

import packageJson from "../../../package.json";

const createEmptyClues = () => Array.from({ length: GAME_DEFAULTS.cluesPerPlayer }, () => "");

const isError = (value: unknown): value is { error: string } =>
  Boolean(value && typeof value === "object" && "error" in value);

const chooseSuggestion = (used: string[]) => {
  const clueSuggestions = getHatClueSuggestions();
  const remaining = clueSuggestions.filter((suggestion) => !used.includes(suggestion));
  const source = remaining.length > 0 ? remaining : clueSuggestions;
  return source[Math.floor(Math.random() * source.length)] ?? "";
};

export function useHatSingleplayerApp() {
  const [snapshot, setSnapshot] = useState<AppSnapshot>(() => createInitialHatSnapshot("landing"));
  const [savedRecord, setSavedRecord] = useState<StoragePayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [confirmNewGame, setConfirmNewGame] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    void loadSavedState()
      .then((record) => {
        if (!record) {
          return;
        }
        // Do not offer resume after a finished game (stale storage from older builds).
        if (record.snapshot.step === "game" && record.snapshot.session?.stage === "results") {
          void clearSavedState();
          return;
        }
        setSavedRecord(record);
      })
      .finally(() => {
        setLoaded(true);
      });
  }, []);

  const persistSnapshot = async (nextSnapshot: AppSnapshot) => {
    if (nextSnapshot.step === "landing") {
      return null;
    }
    // Finished session: keep UI in memory but drop persistence so "Resume" is for mid-game only.
    if (nextSnapshot.step === "game" && nextSnapshot.session?.stage === "results") {
      setSavedRecord(null);
      await clearSavedState();
      return null;
    }
    const record: StoragePayload = {
      schemaVersion: 1,
      lastSavedAt: new Date().toISOString(),
      snapshot: nextSnapshot,
    };
    setSavedRecord(record);
    await saveState(record);
    return record;
  };

  useEffect(() => {
    if (loaded && snapshot.step !== "landing") {
      persistSnapshot(snapshot).catch(() => undefined);
    }
  }, [loaded, snapshot]);

  const dispatchGameAction = (action: HatGameAction) => {
    const previousSession = snapshotRef.current.session;
    if (!previousSession) {
      return;
    }
    const result = applyHatGameAction(previousSession, action);
    if (isError(result)) {
      setError(result.error);
      return;
    }

    playHatActionSoundEffects(previousSession, result, action, turnEndCueTurnRef, playSoundCue);

    setError("");
    setSnapshot((current) => ({
      ...current,
      session: result,
      handoffRevealed: result.stage === "ready" ? false : current.handoffRevealed,
    }));
  };
  const { secondsRemaining, turnEndCueTurnRef } = useHatTurnLifecycle(
    snapshot,
    snapshotRef,
    dispatchGameAction,
  );

  const activeTeam = useMemo(() => {
    if (snapshot.step === "team") {
      return snapshot.teams[snapshot.teamEditIndex] ?? null;
    }
    return null;
  }, [snapshot.step, snapshot.teamEditIndex, snapshot.teams]);

  const activeTeamPlayers = useMemo(
    () => (activeTeam ? snapshot.players.filter((player) => player.teamId === activeTeam.id) : []),
    [activeTeam, snapshot.players],
  );

  const actionLockKey = [
    loaded ? "loaded" : "loading",
    snapshot.step,
    snapshot.teamEditIndex,
    snapshot.clueEntryIndex,
    snapshot.clueEntryRevealed ? "clue-open" : "clue-closed",
    snapshot.handoffRevealed ? "handoff-open" : "handoff-closed",
    snapshot.session?.stage ?? "no-session",
    snapshot.session?.phaseNumber ?? "no-phase",
    snapshot.session?.activeTurn?.startedAt ?? "no-turn",
    confirmNewGame ? "confirm-new" : "normal",
  ].join(":");

  const footerActionsLocked = useFooterActionLockOnKeyChange(actionLockKey);
  useAutoHidePopup(showInfoPopup, () => setShowInfoPopup(false));

  const startNewGame = makeSingleplayerStartNewGame({
    clearSavedState,
    resetSnapshot: () => createInitialHatSnapshot("settings"),
    setConfirmNewGame,
    setError,
    setSavedRecord,
    setSnapshot,
  });

  const resumeSavedGame = makeSingleplayerResumeSavedGame({
    normalize: normalizeHatSnapshot,
    savedRecord,
    setConfirmNewGame,
    setError,
    setSnapshot,
  });

  const exitToLanding = () => {
    setConfirmNewGame(false);
    setError("");
    void persistSnapshot(snapshot);
    setSnapshot((current) => ({ ...current, step: "landing" }));
  };

  const updateHatTeamCountSetting = (teamCount: number) => {
    if (teamCount < GAME_DEFAULTS.minTeams || teamCount > GAME_DEFAULTS.maxTeams) {
      return;
    }
    setSnapshot((current) => ({ ...current, teamCount }));
  };

  const updateHatTurnDurationSeconds = (seconds: number) => {
    setSnapshot((current) => ({ ...current, turnDurationSeconds: seconds }));
  };

  const updateHatSkipsPerTurn = (skips: number) => {
    setSnapshot((current) => ({ ...current, skipsPerTurn: skips }));
  };

  /** Build 2 players per team and move into per-team setup (same pattern as WhoWhatWhere). */
  const confirmTeamCountAndStartTeamSetup = () => {
    const result = createHatTeamSetup(snapshotRef.current);
    if (!result.snapshot) return setError(result.error);
    setSnapshot(result.snapshot);
    setError("");
  };

  const applyHatRosterFromRows = (rows: readonly HatRosterTeamRow[]) => {
    setError("");
    setSnapshot((current) => applyHatRosterTransition(current, rows));
  };

  const addPlayerToHatRosterRows = (rows: readonly HatRosterTeamRow[], teamId: string) => {
    const current = snapshotRef.current;
    const { teams, players } = applyRosterRowsToHat(rows, current.teams);
    const result = addPlayerToHatTeam(teams, players, teamId);
    return result ? hatStateToRosterRows(result.teams, result.players) : [...rows];
  };

  const removePlayerFromHatRosterRows = (
    rows: readonly HatRosterTeamRow[],
    teamId: string,
    playerId: string,
  ) => {
    const current = snapshotRef.current;
    const { teams, players } = applyRosterRowsToHat(rows, current.teams);
    const result = removePlayerFromHatTeam(teams, players, teamId, playerId);
    return result ? hatStateToRosterRows(result.teams, result.players) : [...rows];
  };

  const updateClue = (playerId: string, clueIndex: number, value: string) => {
    setSnapshot((current) => ({
      ...current,
      clueSubmissions: {
        ...current.clueSubmissions,
        [playerId]: {
          clues: (current.clueSubmissions[playerId]?.clues ?? createEmptyClues()).map(
            (clue, index) =>
              index === clueIndex ? value.slice(0, GAME_DEFAULTS.maxClueLength) : clue,
          ),
        },
      },
    }));
  };

  const fillSuggestion = (playerId: string, clueIndex: number) => {
    const used = Object.values(snapshotRef.current.clueSubmissions).flatMap((entry) =>
      entry.clues.map((clue) => clue.trim()).filter(Boolean),
    );
    updateClue(playerId, clueIndex, chooseSuggestion(used));
  };

  const confirmTeamStep = () => {
    const result = advanceHatTeamStep(snapshotRef.current);
    if (!result.snapshot) return setError(result.error);
    setSnapshot(result.snapshot);
    setError("");
  };

  const backTeamStep = () => {
    setSnapshot(backHatTeamStep);
  };

  const editTeams = () => {
    setSnapshot((current) => ({ ...current, step: "team", teamEditIndex: 0 }));
  };

  const startClueEntry = () => {
    const result = beginHatClueEntry(snapshotRef.current);
    if (!result.snapshot) return setError(result.error);
    setSnapshot(result.snapshot);
    setError("");
  };

  const revealClueEntry = () => {
    setSnapshot((current) => ({ ...current, clueEntryRevealed: true }));
  };

  const confirmClues = () => {
    const result = advanceHatClueEntry(snapshotRef.current);
    if (!result.snapshot) return setError(result.error);
    setSnapshot(result.snapshot);
    setError("");
  };

  const revealHandoff = () => {
    setSnapshot((current) => ({ ...current, handoffRevealed: true }));
  };

  const playAgain = () => {
    setSnapshot((current) => startHatSession(current, snapshot));
  };

  return {
    appVersion: packageJson.version,
    snapshot,
    savedRecord,
    loaded,
    error,
    secondsRemaining,
    confirmNewGame,
    footerActionsLocked,
    showInfoPopup,
    activeTeam,
    activeTeamPlayers,
    setConfirmNewGame,
    setShowInfoPopup,
    startNewGame,
    resumeSavedGame,
    exitToLanding,
    updateHatTeamCountSetting,
    updateHatTurnDurationSeconds,
    updateHatSkipsPerTurn,
    confirmTeamCountAndStartTeamSetup,
    applyHatRosterFromRows,
    addPlayerToHatRosterRows,
    removePlayerFromHatRosterRows,
    updateClue,
    fillSuggestion,
    confirmTeamStep,
    backTeamStep,
    editTeams,
    startClueEntry,
    revealClueEntry,
    confirmClues,
    revealHandoff,
    dispatchGameAction,
    playAgain,
  };
}

export type HatSingleplayerAppController = ReturnType<typeof useHatSingleplayerApp>;
