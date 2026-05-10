import { useEffect, useMemo, useRef, useState } from "react";

import { FOOTER_ACTION_LOCK_MS } from "@/components/footerActionLockContext";
import { GAME_DEFAULTS, type HatGameConfig } from "@/config/hatGameDefaults";
import { MIN_PLAYERS_PER_TEAM } from "@/config/teamRoster";
import clueSuggestions from "@/data/clueSuggestions.json";
import {
  applyHatGameAction,
  createHatGameSession,
} from "@/domain/hat-game/engine";
import {
  addPlayerToHatTeam,
  applyRosterRowsToHat,
  buildDefaultSetup,
  getHatGameSetupError,
  type HatRosterTeamRow,
  hatStateToRosterRows,
  removePlayerFromHatTeam,
} from "@/domain/hat-game/setup";
import { getCountdownSeconds } from "@/domain/hat-game/time";
import type { ClueSubmissionMap, HatGameAction } from "@/domain/hat-game/types";
import { playHatGameActionSoundEffects } from "@/features/hat-game/hatGameActionSound";
import type { AppSnapshot, AppStep, StoragePayload } from "@/features/hat-game/hatGameAppTypes";
import { formatSavedAt } from "@/lib/formatSavedAt";
import { playSoundCue } from "@/services/hatGameSound";
import {
  clearSavedState,
  loadSavedState,
  saveState,
} from "@/services/hatGameStorage";

import packageJson from "../../../package.json";

const createEmptyClues = () => Array.from({ length: GAME_DEFAULTS.cluesPerPlayer }, () => '');

const createInitialSnapshot = (step: AppStep = "settings"): AppSnapshot => ({
  step,
  teamEditIndex: 0,
  playerCount: 0,
  teamCount: 2,
  teams: [],
  players: [],
  clueSubmissions: {},
  clueEntryIndex: 0,
  clueEntryRevealed: false,
  handoffRevealed: false,
  session: null,
  turnDurationSeconds: GAME_DEFAULTS.turnDurationSeconds,
  skipsPerTurn: GAME_DEFAULTS.skipsPerTurn,
});

/** Older builds used `counts` for the team-count-only step; merge setup prefs defaults. */
const normalizeSnapshotStep = (snapshot: AppSnapshot): AppSnapshot => {
  const step = snapshot.step as string;
  const stepFixed = step === "counts" ? "settings" : snapshot.step;
  return {
    ...snapshot,
    step: stepFixed,
    turnDurationSeconds:
      snapshot.turnDurationSeconds ?? GAME_DEFAULTS.turnDurationSeconds,
    skipsPerTurn: snapshot.skipsPerTurn ?? GAME_DEFAULTS.skipsPerTurn,
  };
};

const sessionConfigFromSnapshot = (snapshot: AppSnapshot): HatGameConfig => ({
  ...GAME_DEFAULTS,
  turnDurationSeconds: snapshot.turnDurationSeconds,
  skipsPerTurn: snapshot.skipsPerTurn,
});

export { formatSavedAt };

const syncClueSubmissions = (players: AppSnapshot['players'], current: ClueSubmissionMap): ClueSubmissionMap =>
  Object.fromEntries(
    players.map((player) => [
      player.id,
      {
        clues: Array.from(
          { length: GAME_DEFAULTS.cluesPerPlayer },
          (_, index) => current[player.id]?.clues[index] ?? ''
        )
      }
    ])
  );

const isError = (value: unknown): value is { error: string } =>
  Boolean(value && typeof value === 'object' && 'error' in value);

const isStoragePayload = (value: unknown): value is StoragePayload =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'schemaVersion' in value &&
      'snapshot' in value &&
      'lastSavedAt' in value
  );

const chooseSuggestion = (used: string[]) => {
  const remaining = (clueSuggestions as string[]).filter((suggestion) => !used.includes(suggestion));
  const source = remaining.length > 0 ? remaining : (clueSuggestions as string[]);
  return source[Math.floor(Math.random() * source.length)] ?? '';
};

export function useHatGameApp() {
  const [snapshot, setSnapshot] = useState<AppSnapshot>(() => createInitialSnapshot('landing'));
  const [savedRecord, setSavedRecord] = useState<StoragePayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [confirmNewGame, setConfirmNewGame] = useState(false);
  const [footerActionsLocked, setFooterActionsLocked] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const warningCueTurnRef = useRef<string | null>(null);
  const turnEndCueTurnRef = useRef<string | null>(null);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    void loadSavedState<StoragePayload | AppSnapshot>().then((saved) => {
      if (!saved) {
        return;
      }
      const record = isStoragePayload(saved)
        ? {
            ...saved,
            snapshot: normalizeSnapshotStep(saved.snapshot),
          }
        : {
            schemaVersion: 1 as const,
            lastSavedAt: new Date().toISOString(),
            snapshot: normalizeSnapshotStep(saved),
          };
      // Do not offer resume after a finished game (stale storage from older builds).
      if (
        record.snapshot.step === "game" &&
        record.snapshot.session?.stage === "results"
      ) {
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
    if (
      nextSnapshot.step === "game" &&
      nextSnapshot.session?.stage === "results"
    ) {
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
    if (loaded && snapshot.step !== 'landing') {
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

    playHatGameActionSoundEffects(previousSession, result, action, turnEndCueTurnRef, playSoundCue);

    setError('');
    setSnapshot((current) => ({
      ...current,
      session: result,
      handoffRevealed: result.stage === 'ready' ? false : current.handoffRevealed
    }));
  };

  useEffect(() => {
    if (snapshot.step !== 'game' || snapshot.session?.stage !== 'turn' || !snapshot.session.activeTurn?.endsAt) {
      setSecondsRemaining(0);
      warningCueTurnRef.current = null;
      return undefined;
    }

    const turnCueKey = snapshot.session.activeTurn.startedAt;
    const tick = () => {
      const remaining = getCountdownSeconds(snapshotRef.current.session?.activeTurn?.endsAt);
      setSecondsRemaining(remaining);
      if (remaining <= 10 && remaining > 0 && warningCueTurnRef.current !== turnCueKey) {
        warningCueTurnRef.current = turnCueKey;
        playSoundCue('ten-second-warning');
      }
      if (remaining <= 0) {
        dispatchGameAction({ type: 'end-turn' });
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [
    snapshot.step,
    snapshot.session?.activeTurn?.endsAt,
    snapshot.session?.activeTurn?.startedAt,
    snapshot.session?.stage,
  ]);

  const activeTeam = useMemo(() => {
    if (snapshot.step === 'team') {
      return snapshot.teams[snapshot.teamEditIndex] ?? null;
    }
    return null;
  }, [snapshot.step, snapshot.teamEditIndex, snapshot.teams]);

  const activeTeamPlayers = useMemo(
    () => (activeTeam ? snapshot.players.filter((player) => player.teamId === activeTeam.id) : []),
    [activeTeam, snapshot.players]
  );

  const actionLockKey = [
    loaded ? 'loaded' : 'loading',
    snapshot.step,
    snapshot.teamEditIndex,
    snapshot.clueEntryIndex,
    snapshot.clueEntryRevealed ? 'clue-open' : 'clue-closed',
    snapshot.handoffRevealed ? 'handoff-open' : 'handoff-closed',
    snapshot.session?.stage ?? 'no-session',
    snapshot.session?.phaseNumber ?? 'no-phase',
    snapshot.session?.activeTurn?.startedAt ?? 'no-turn',
    confirmNewGame ? 'confirm-new' : 'normal'
  ].join(':');

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
    setError('');
    await clearSavedState();
    setSnapshot(createInitialSnapshot("settings"));
  };

  const resumeSavedGame = () => {
    if (!savedRecord) {
      return;
    }
    setConfirmNewGame(false);
    setError('');
    setSnapshot(normalizeSnapshotStep(savedRecord.snapshot));
  };

  const exitToLanding = () => {
    setConfirmNewGame(false);
    setError('');
    void persistSnapshot(snapshot);
    setSnapshot((current) => ({ ...current, step: 'landing' }));
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
    const teamCount = snapshotRef.current.teamCount;
    const playerCount = teamCount * MIN_PLAYERS_PER_TEAM;
    const setupError = getHatGameSetupError({ playerCount, teamCount });
    if (setupError) {
      setError(setupError);
      return;
    }
    const { teams, players } = buildDefaultSetup(playerCount, teamCount);
    setSnapshot((current) => ({
      ...current,
      step: "team",
      teamEditIndex: 0,
      playerCount: players.length,
      teamCount,
      teams,
      players,
      clueSubmissions: syncClueSubmissions(players, {}),
      session: null,
    }));
    setError("");
  };

  const applyHatRosterFromRows = (rows: readonly HatRosterTeamRow[]) => {
    setError("");
    setSnapshot((current) => {
      const { teams, players } = applyRosterRowsToHat(rows, current.teams);
      return {
        ...current,
        teams,
        players,
        playerCount: players.length,
        clueSubmissions: syncClueSubmissions(players, current.clueSubmissions),
      };
    });
  };

  const addPlayerToHatRosterRows = (
    rows: readonly HatRosterTeamRow[],
    teamId: string,
  ) => {
    const current = snapshotRef.current;
    const { teams, players } = applyRosterRowsToHat(rows, current.teams);
    const result = addPlayerToHatTeam(teams, players, teamId);
    return result
      ? hatStateToRosterRows(result.teams, result.players)
      : [...rows];
  };

  const removePlayerFromHatRosterRows = (
    rows: readonly HatRosterTeamRow[],
    teamId: string,
    playerId: string,
  ) => {
    const current = snapshotRef.current;
    const { teams, players } = applyRosterRowsToHat(rows, current.teams);
    const result = removePlayerFromHatTeam(teams, players, teamId, playerId);
    return result
      ? hatStateToRosterRows(result.teams, result.players)
      : [...rows];
  };

  const updateClue = (playerId: string, clueIndex: number, value: string) => {
    setSnapshot((current) => ({
      ...current,
      clueSubmissions: {
        ...current.clueSubmissions,
        [playerId]: {
          clues: (current.clueSubmissions[playerId]?.clues ?? createEmptyClues()).map((clue, index) =>
            index === clueIndex ? value.slice(0, GAME_DEFAULTS.maxClueLength) : clue
          )
        }
      }
    }));
  };

  const fillSuggestion = (playerId: string, clueIndex: number) => {
    const used = Object.values(snapshotRef.current.clueSubmissions).flatMap((entry) =>
      entry.clues.map((clue) => clue.trim()).filter(Boolean)
    );
    updateClue(playerId, clueIndex, chooseSuggestion(used));
  };

  const confirmTeamStep = () => {
    if (!activeTeam) {
      return;
    }
    if (!activeTeam.name.trim() || activeTeamPlayers.some((player) => !player.name.trim())) {
      setError('Name the team and every player before continuing.');
      return;
    }
    setError('');
    setSnapshot((current) => ({
      ...current,
      teamEditIndex: current.teamEditIndex + 1,
      step: current.teamEditIndex >= current.teams.length - 1 ? 'review' : 'team'
    }));
  };

  const backTeamStep = () => {
    setSnapshot((current) => ({
      ...current,
      step: current.teamEditIndex === 0 ? "settings" : "team",
      teamEditIndex: Math.max(0, current.teamEditIndex - 1)
    }));
  };

  const editTeams = () => {
    setSnapshot((current) => ({ ...current, step: 'team', teamEditIndex: 0 }));
  };

  const startClueEntry = () => {
    const setupError = getHatGameSetupError({
      playerCount: snapshot.players.length,
      teamCount: snapshot.teamCount,
      teams: snapshot.teams,
      players: snapshot.players,
    });
    if (setupError) {
      setError(setupError);
      return;
    }
    setSnapshot((current) => ({
      ...current,
      step: 'clues',
      clueEntryIndex: 0,
      clueEntryRevealed: false,
      clueSubmissions: syncClueSubmissions(current.players, current.clueSubmissions)
    }));
    setError('');
  };

  const revealClueEntry = () => {
    setSnapshot((current) => ({ ...current, clueEntryRevealed: true }));
  };

  const confirmClues = () => {
    const player = snapshot.players[snapshot.clueEntryIndex];
    if (!player) {
      return;
    }
    const clues = snapshot.clueSubmissions[player.id]?.clues ?? createEmptyClues();
    if (clues.some((clue) => clue.trim().length === 0)) {
      setError(`Fill in every famous figure before handing the phone on from ${player.name}.`);
      return;
    }
    if (snapshot.clueEntryIndex >= snapshot.players.length - 1) {
      const session = createHatGameSession({
        players: snapshot.players,
        teams: snapshot.teams,
        config: sessionConfigFromSnapshot(snapshot),
        clueSubmissions: snapshot.clueSubmissions
      });
      setSnapshot((current) => ({ ...current, step: 'game', session, handoffRevealed: false }));
    } else {
      setSnapshot((current) => ({
        ...current,
        clueEntryIndex: current.clueEntryIndex + 1,
        clueEntryRevealed: false
      }));
    }
    setError('');
  };

  const revealHandoff = () => {
    setSnapshot((current) => ({ ...current, handoffRevealed: true }));
  };

  const playAgain = () => {
    const session = createHatGameSession({
      players: snapshot.players,
      teams: snapshot.teams,
      config: sessionConfigFromSnapshot(snapshot),
      clueSubmissions: snapshot.clueSubmissions
    });
    setSnapshot((current) => ({ ...current, step: 'game', session, handoffRevealed: false }));
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
    playAgain
  };
}

export type HatGameAppController = ReturnType<typeof useHatGameApp>;

