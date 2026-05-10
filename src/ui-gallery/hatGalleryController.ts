import { GAME_DEFAULTS } from "@/config/hatGameDefaults";
import type { Player, Team } from "@/domain/hat-game/types";
import type { AppSnapshot, StoragePayload } from "@/features/hat-game/hatGameAppTypes";
import type { HatGameAppController } from "@/features/hat-game/useHatGameApp";
import {
  getGalleryHatSetup,
  hatGallerySessionFinalTurnRecap,
  hatGallerySessionMidTurnWithSkips,
  hatGallerySessionReadyWithSummary,
  hatGallerySessionResults,
} from "@/ui-gallery/hatGallerySessions";

const noop = () => undefined;
const noopAsync = async () => undefined;

/** Merge defaults for gallery snapshots built before `AppSnapshot` gained setup prefs. */
function normalizeGallerySnapshot(snapshot: AppSnapshot): AppSnapshot {
  return {
    ...snapshot,
    turnDurationSeconds:
      snapshot.turnDurationSeconds ?? GAME_DEFAULTS.turnDurationSeconds,
    skipsPerTurn: snapshot.skipsPerTurn ?? GAME_DEFAULTS.skipsPerTurn,
  };
}

function galleryActiveTeam(snapshot: AppSnapshot): {
  readonly activeTeam: Team | null;
  readonly activeTeamPlayers: Player[];
} {
  if (snapshot.step !== "team") {
    return { activeTeam: null, activeTeamPlayers: [] };
  }
  const activeTeam = snapshot.teams[snapshot.teamEditIndex] ?? null;
  const activeTeamPlayers = activeTeam
    ? snapshot.players.filter((player) => player.teamId === activeTeam.id)
    : [];
  return { activeTeam, activeTeamPlayers };
}

/**
 * Minimal controller for static Hat Game screens — actions are no-ops so the gallery
 * never mutates state or plays persistence side effects.
 */
export function createHatGalleryController(
  snapshot: AppSnapshot,
  options: {
    readonly secondsRemaining?: number;
    readonly savedRecord?: StoragePayload | null;
  } = {},
): HatGameAppController {
  const normalized = normalizeGallerySnapshot(snapshot);
  const { activeTeam, activeTeamPlayers } = galleryActiveTeam(normalized);
  const turnActive =
    normalized.step === "game" &&
    normalized.session?.stage === "turn" &&
    Boolean(normalized.session.activeTurn);
  const secondsRemaining =
    options.secondsRemaining ?? (turnActive ? 38 : 0);

  return {
    appVersion: "gallery",
    snapshot: normalized,
    savedRecord: options.savedRecord ?? null,
    loaded: true,
    error: "",
    secondsRemaining,
    confirmNewGame: false,
    footerActionsLocked: false,
    showInfoPopup: false,
    activeTeam,
    activeTeamPlayers,
    setConfirmNewGame: noop,
    setShowInfoPopup: noop,
    startNewGame: noopAsync,
    resumeSavedGame: noop,
    exitToLanding: noop,
    updateHatTeamCountSetting: noop,
    updateHatTurnDurationSeconds: noop,
    updateHatSkipsPerTurn: noop,
    confirmTeamCountAndStartTeamSetup: noop,
    applyHatRosterFromRows: noop,
    addPlayerToHatRosterRows: (rows) => [...rows],
    removePlayerFromHatRosterRows: (rows) => [...rows],
    updateClue: noop,
    fillSuggestion: noop,
    confirmTeamStep: noop,
    backTeamStep: noop,
    editTeams: noop,
    startClueEntry: noop,
    revealClueEntry: noop,
    confirmClues: noop,
    revealHandoff: noop,
    dispatchGameAction: noop,
    playAgain: noop,
  };
}

/** Defaults for `AppSnapshot` setup prefs in static gallery fixtures. */
function hatGallerySetupPrefs(): Pick<
  AppSnapshot,
  "turnDurationSeconds" | "skipsPerTurn"
> {
  return {
    turnDurationSeconds: GAME_DEFAULTS.turnDurationSeconds,
    skipsPerTurn: GAME_DEFAULTS.skipsPerTurn,
  };
}

export function hatSnapshotLanding(): AppSnapshot {
  return {
    step: "landing",
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
    ...hatGallerySetupPrefs(),
  };
}

export function hatSnapshotSettings(): AppSnapshot {
  return {
    step: "settings",
    teamEditIndex: 0,
    playerCount: 0,
    teamCount: 3,
    teams: [],
    players: [],
    clueSubmissions: {},
    clueEntryIndex: 0,
    clueEntryRevealed: false,
    handoffRevealed: false,
    session: null,
    ...hatGallerySetupPrefs(),
  };
}

export function hatSnapshotTeam(teamEditIndex: number): AppSnapshot {
  const { teams, players, clueSubmissions } = getGalleryHatSetup();
  return {
    step: "team",
    teamEditIndex,
    playerCount: players.length,
    teamCount: 2,
    teams,
    players,
    clueSubmissions,
    clueEntryIndex: 0,
    clueEntryRevealed: false,
    handoffRevealed: false,
    session: null,
    ...hatGallerySetupPrefs(),
  };
}

export function hatSnapshotReview(): AppSnapshot {
  const { teams, players, clueSubmissions } = getGalleryHatSetup();
  return {
    step: "review",
    teamEditIndex: 0,
    playerCount: players.length,
    teamCount: 2,
    teams,
    players,
    clueSubmissions,
    clueEntryIndex: 0,
    clueEntryRevealed: false,
    handoffRevealed: false,
    session: null,
    ...hatGallerySetupPrefs(),
  };
}

export function hatSnapshotClueEntry(revealed: boolean): AppSnapshot {
  const { teams, players, clueSubmissions } = getGalleryHatSetup();
  return {
    step: "clues",
    teamEditIndex: 0,
    playerCount: players.length,
    teamCount: 2,
    teams,
    players,
    clueSubmissions,
    clueEntryIndex: 0,
    clueEntryRevealed: revealed,
    handoffRevealed: false,
    session: null,
    ...hatGallerySetupPrefs(),
  };
}

export function hatSnapshotGame(
  session: AppSnapshot["session"],
  handoffRevealed: boolean,
): AppSnapshot {
  const { teams, players, clueSubmissions } = getGalleryHatSetup();
  return {
    step: "game",
    teamEditIndex: 0,
    playerCount: players.length,
    teamCount: 2,
    teams,
    players,
    clueSubmissions,
    clueEntryIndex: 0,
    clueEntryRevealed: false,
    handoffRevealed,
    session,
    ...hatGallerySetupPrefs(),
  };
}

/** Pre-built snapshots for the slide strip (pair Hat + Who What Where per index). */
export const hatGallerySnapshots = {
  landing: hatSnapshotLanding(),
  settings: hatSnapshotSettings(),
  teamFirst: hatSnapshotTeam(0),
  teamSecond: hatSnapshotTeam(1),
  review: hatSnapshotReview(),
  clueHidden: hatSnapshotClueEntry(false),
  clueForm: hatSnapshotClueEntry(true),
  readyRecapHandoffOff: hatSnapshotGame(hatGallerySessionReadyWithSummary(), false),
  readyRecapHandoffOn: hatSnapshotGame(hatGallerySessionReadyWithSummary(), true),
  turnSkips: hatSnapshotGame(hatGallerySessionMidTurnWithSkips(), false),
  finalTurnRecap: hatSnapshotGame(hatGallerySessionFinalTurnRecap(), false),
  results: hatSnapshotGame(hatGallerySessionResults(), false),
} as const;
