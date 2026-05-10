import { GAME_DEFAULTS, type HatGameConfig } from "@/config/hatGameDefaults";

import {
  buildLeaderboard,
  getTimedTeamContext,
  normalizeText,
  shuffleArray,
  sortPlayersBySeat
} from './teamUtils';
import type {
  ActiveTurn,
  BestTurnSummary,
  ClueHistoryEntry,
  CluePoolEntry,
  ClueSubmissionMap,
  HatGameAction,
  HatGameActionResult,
  HatGameSession,
  HatGameSettings,
  Player,
  QueuedClue,
  Team,
  TurnSummary
} from './types';

type ActionRuntime = {
  rng: () => number;
  nowMs: () => number;
  toIso: (timestamp: number) => string;
  makeTimestamp: () => string;
  isPast: (timestamp: string) => boolean;
};

const HAT_GAME_PHASES = {
  1: {
    name: 'Describe',
    instruction: 'Use as many words as you want, but do not say any part of the name.'
  },
  2: {
    name: 'One Word',
    instruction: 'Say exactly one word only. No gestures.'
  },
  3: {
    name: 'Charades',
    instruction: 'Act it out silently. No words or sounds.'
  }
} as const;

export const getHatGamePhaseMeta = (phaseNumber: number) =>
  HAT_GAME_PHASES[phaseNumber as keyof typeof HAT_GAME_PHASES] ?? HAT_GAME_PHASES[1];

export const getHatGameContext = (session: HatGameSession) =>
  getTimedTeamContext({
    players: session.players,
    teams: session.teams,
    teamOrder: session.teamOrder,
    teamIndex: session.teamIndex,
    describerIndexes: session.describerIndexes
  });

const buildHatGameCluePool = (
  players: Player[],
  clueSubmissions: ClueSubmissionMap
): CluePoolEntry[] =>
  sortPlayersBySeat(players).flatMap((player) =>
    (clueSubmissions[player.id]?.clues ?? [])
      .map((clue) => normalizeText(clue))
      .filter(Boolean)
      .map((clue) => ({
        text: clue,
        submittedBy: player.id,
        submittedByName: player.name
      }))
  );

const syncSkipState = (activeTurn: ActiveTurn, skipLimit: number): ActiveTurn => ({
  ...activeTurn,
  skipsRemaining: Math.max(skipLimit - (activeTurn.skippedClues?.length ?? 0), 0)
});

const hasUnresolvedSkippedClues = (activeTurn: ActiveTurn) =>
  activeTurn.skippedClues.length > 0 || activeTurn.currentSkippedCluePoolIndex !== null;

const movePreviousVisibleClueFromFront = (queue: QueuedClue[], lastSeenCluePoolIndex?: number | null) => {
  if (queue.length <= 1 || queue[0]?.poolIndex !== lastSeenCluePoolIndex) {
    return queue;
  }

  const head = queue[0];
  if (head === undefined) {
    return queue;
  }
  return [...queue.slice(1), head];
};

const collectClueQueue = (session: HatGameSession, rng: () => number) =>
  movePreviousVisibleClueFromFront(
    shuffleArray(
      session.cluePool
        .map((clue, index) => ({ ...clue, poolIndex: index }))
        .filter((clue) => !session.usedCluePoolIndices.includes(clue.poolIndex)),
      rng
    ),
    session.lastSeenCluePoolIndex
  );

const buildFullPhaseQueue = (session: HatGameSession, rng: () => number) =>
  shuffleArray(session.cluePool.map((clue, index) => ({ ...clue, poolIndex: index })), rng);

const currentQueuedClue = (activeTurn: ActiveTurn): QueuedClue | null =>
  activeTurn.clueQueue[activeTurn.queueIndex] ?? null;

const cloneActiveTurn = (activeTurn: ActiveTurn): ActiveTurn => ({
  ...activeTurn,
  clueQueue: [...activeTurn.clueQueue],
  skippedClues: [...activeTurn.skippedClues],
  clueHistory: [...activeTurn.clueHistory]
});

const buildHistoryEntry = ({
  clue,
  status,
  phaseNumber,
  makeTimestamp
}: {
  clue: QueuedClue;
  status: ClueHistoryEntry['status'];
  phaseNumber: number;
  makeTimestamp: () => string;
}): ClueHistoryEntry => ({
  clue: clue.text,
  status,
  timestamp: makeTimestamp(),
  poolIndex: clue.poolIndex,
  phaseNumber
});

const currentPhaseCorrectPoolIndices = (session: HatGameSession, activeTurn: ActiveTurn) =>
  activeTurn.clueHistory
    .filter(
      (entry) =>
        entry.status === 'correct' &&
        (entry.phaseNumber === session.phaseNumber ||
          (entry.phaseNumber === undefined && session.phaseNumber === 1))
    )
    .map((entry) => entry.poolIndex);

const nextUsedCluePoolIndices = (session: HatGameSession, activeTurn: ActiveTurn) => [
  ...new Set([...session.usedCluePoolIndices, ...currentPhaseCorrectPoolIndices(session, activeTurn)])
];

const buildResults = (session: HatGameSession) => {
  const leaderboard = buildLeaderboard(session.teams);
  const topScore = leaderboard[0]?.score ?? 0;
  const winnerTeamIds = leaderboard
    .filter((team) => team.score === topScore)
    .map((team) => team.teamId);

  return {
    leaderboard,
    winnerTeamIds,
    isTie: winnerTeamIds.length > 1,
    totalClues: session.cluePool.length,
    bestTurn: session.bestTurnSummary
  };
};

const buildTurnSummary = ({
  session,
  activeTurn,
  phaseCompleted,
  nextPhaseNumber
}: {
  session: HatGameSession;
  activeTurn: ActiveTurn;
  phaseCompleted: boolean;
  nextPhaseNumber: number;
}): TurnSummary => {
  const context = getHatGameContext(session);

  return {
    teamId: context.activeTeamId ?? '',
    teamName: context.activeTeam?.name ?? 'Team',
    describerId: context.activeDescriberId,
    describerName: context.activeDescriberName,
    scoreDelta: activeTurn.score,
    correctCount: activeTurn.correctCount,
    skippedCount: activeTurn.skippedCount,
    clues: activeTurn.clueHistory,
    phaseCompleted,
    completedPhaseNumber: phaseCompleted ? session.phaseNumber : null,
    nextPhaseNumber: phaseCompleted && session.phaseNumber < 3 ? nextPhaseNumber : null,
    nextPhaseName:
      phaseCompleted && session.phaseNumber < 3 ? getHatGamePhaseMeta(nextPhaseNumber).name : null
  };
};

const buildCurrentTurnHighlight = (
  session: HatGameSession,
  activeTurn: ActiveTurn
): BestTurnSummary => {
  const context = getHatGameContext(session);

  return {
    teamId: context.activeTeamId ?? '',
    teamName: context.activeTeam?.name ?? 'Team',
    describerId: context.activeDescriberId,
    describerName: context.activeDescriberName,
    score: activeTurn.score,
    phaseNumber: session.phaseNumber,
    phaseName: getHatGamePhaseMeta(session.phaseNumber).name
  };
};

const updateBestTurnSummary = (session: HatGameSession, activeTurn: ActiveTurn) => {
  const currentTurnHighlight = buildCurrentTurnHighlight(session, activeTurn);
  return !session.bestTurnSummary || currentTurnHighlight.score > session.bestTurnSummary.score
    ? currentTurnHighlight
    : session.bestTurnSummary;
};

const rotateDescriber = (session: HatGameSession) => {
  const context = getHatGameContext(session);
  if (!context.activeTeamId) {
    return session.describerIndexes;
  }

  const currentDescriberIndex = session.describerIndexes[context.activeTeamId] ?? 0;
  return {
    ...session.describerIndexes,
    [context.activeTeamId]:
      context.activeTeamPlayers.length === 0
        ? 0
        : (currentDescriberIndex + 1) % context.activeTeamPlayers.length
  };
};

const rotateTeam = (session: HatGameSession) => {
  let teamIndex = session.teamIndex + 1;
  let roundNumber = session.roundNumber;

  if (teamIndex >= session.teamOrder.length) {
    teamIndex = 0;
    roundNumber += 1;
  }

  return { teamIndex, roundNumber };
};

const startTurn = (session: HatGameSession, runtime: ActionRuntime): HatGameActionResult => {
  if (session.stage !== 'ready') {
    return { error: 'The next turn is already underway' };
  }

  const clueQueue = collectClueQueue(session, runtime.rng);
  if (clueQueue.length === 0) {
    return { error: 'No famous figures are available for this turn right now' };
  }

  const startedAt = runtime.nowMs();
  return {
    ...session,
    stage: 'turn',
    activeTurn: syncSkipState(
      {
        startedAt: runtime.toIso(startedAt),
        endsAt: runtime.toIso(startedAt + session.settings.turnDurationSeconds * 1000),
        durationSeconds: session.settings.turnDurationSeconds,
        clueQueue,
        queueIndex: 0,
        score: 0,
        correctCount: 0,
        skippedCount: 0,
        skipsRemaining: session.settings.skipsPerTurn,
        skippedClues: [],
        currentSkippedCluePoolIndex: null,
        clueHistory: []
      },
      session.settings.skipsPerTurn
    )
  };
};

const advancePhaseWithinTurn = (
  session: HatGameSession,
  activeTurn: ActiveTurn,
  runtime: ActionRuntime
): HatGameActionResult => {
  if (hasUnresolvedSkippedClues(activeTurn)) {
    return { error: 'Bring the skipped famous figure back before moving to the next phase' };
  }

  const nextPhaseNumber = Math.min(session.phaseNumber + 1, 3);
  const nextQueue = buildFullPhaseQueue(session, runtime.rng);

  if (nextQueue.length === 0) {
    return { error: 'No famous figures are available for the next phase' };
  }

  return {
    ...session,
    phaseNumber: nextPhaseNumber,
    usedCluePoolIndices: [],
    activeTurn: syncSkipState(
      {
        ...activeTurn,
        clueQueue: nextQueue,
        queueIndex: 0,
        skippedClues: [],
        currentSkippedCluePoolIndex: null
      },
      session.settings.skipsPerTurn
    )
  };
};

const finishTurn = (session: HatGameSession): HatGameActionResult => {
  const context = getHatGameContext(session);
  if (!session.activeTurn || !context.activeTeamId) {
    return { error: 'No live turn is active right now' };
  }

  const activeTurn = session.activeTurn;
  const lastSeenCluePoolIndex = currentQueuedClue(activeTurn)?.poolIndex ?? null;
  const teams = session.teams.map((team) =>
    team.id === context.activeTeamId ? { ...team, score: team.score + activeTurn.score } : team
  );
  const usedCluePoolIndices = nextUsedCluePoolIndices(session, activeTurn);
  const phaseCompleted =
    session.cluePool.length > 0 && usedCluePoolIndices.length >= session.cluePool.length;
  const nextPhaseNumber = phaseCompleted ? Math.min(session.phaseNumber + 1, 3) : session.phaseNumber;
  const lastTurnSummary = buildTurnSummary({
    session,
    activeTurn,
    phaseCompleted,
    nextPhaseNumber
  });
  const bestTurnSummary = updateBestTurnSummary(session, activeTurn);
  const describerIndexes = rotateDescriber(session);
  const { teamIndex, roundNumber } = rotateTeam(session);

  const nextSession: HatGameSession = {
    ...session,
    teams,
    stage: 'ready',
    activeTurn: null,
    lastTurnSummary,
    bestTurnSummary,
    lastSeenCluePoolIndex,
    teamIndex,
    roundNumber,
    phaseNumber: nextPhaseNumber,
    describerIndexes,
    usedCluePoolIndices: phaseCompleted ? [] : usedCluePoolIndices
  };

  if (phaseCompleted && session.phaseNumber >= 3) {
    return {
      ...nextSession,
      stage: 'finalSummary',
      usedCluePoolIndices: [],
      results: buildResults(nextSession),
    };
  }

  return nextSession;
};

const markCorrect = (
  session: HatGameSession,
  activeTurn: ActiveTurn,
  clue: QueuedClue,
  runtime: ActionRuntime
) => {
  const nextTurn = cloneActiveTurn(activeTurn);
  nextTurn.score += 1;
  nextTurn.correctCount += 1;
  nextTurn.clueHistory.push(
    buildHistoryEntry({
      clue,
      status: 'correct',
      phaseNumber: session.phaseNumber,
      makeTimestamp: runtime.makeTimestamp
    })
  );

  if (nextTurn.currentSkippedCluePoolIndex === clue.poolIndex) {
    nextTurn.currentSkippedCluePoolIndex = null;
  }

  nextTurn.queueIndex += 1;
  return syncSkipState(nextTurn, session.settings.skipsPerTurn);
};

const skipFigure = (
  session: HatGameSession,
  activeTurn: ActiveTurn,
  clue: QueuedClue,
  runtime: ActionRuntime
): ActiveTurn | { error: string } => {
  const nextTurn = cloneActiveTurn(activeTurn);
  if (nextTurn.skipsRemaining <= 0) {
    return { error: 'No skips remain this turn' };
  }

  nextTurn.skippedCount += 1;
  nextTurn.skippedClues.push({ poolIndex: clue.poolIndex, text: clue.text });
  nextTurn.currentSkippedCluePoolIndex = null;
  nextTurn.clueHistory.push(
    buildHistoryEntry({
      clue,
      status: 'skipped',
      phaseNumber: session.phaseNumber,
      makeTimestamp: runtime.makeTimestamp
    })
  );
  const [skippedClue] = nextTurn.clueQueue.splice(nextTurn.queueIndex, 1);
  if (!skippedClue) {
    return { error: "No active famous figure to skip" };
  }
  nextTurn.clueQueue.push(skippedClue);

  return syncSkipState(nextTurn, session.settings.skipsPerTurn);
};

const availableSkippedClues = (activeTurn: ActiveTurn) => {
  const skippedClues = [...activeTurn.skippedClues];
  if (activeTurn.currentSkippedCluePoolIndex !== null) {
    const activeSkippedClue = currentQueuedClue(activeTurn);
    if (activeSkippedClue) {
      skippedClues.unshift({
        poolIndex: activeSkippedClue.poolIndex,
        text: activeSkippedClue.text
      });
    }
  }
  return skippedClues;
};

const returnSkippedFigure = (
  session: HatGameSession,
  activeTurn: ActiveTurn,
  targetPoolIndex?: number
): ActiveTurn | { error: string } => {
  const nextTurn = cloneActiveTurn(activeTurn);
  const skippedClues = availableSkippedClues(nextTurn);
  if (skippedClues.length === 0) {
    return { error: 'There is no skipped famous figure to return to' };
  }

  const selectedPoolIndex = targetPoolIndex ?? skippedClues[0]?.poolIndex ?? null;
  const selectedSkippedClue = skippedClues.find((clue) => clue.poolIndex === selectedPoolIndex);
  if (!selectedSkippedClue) {
    return { error: 'The skipped famous figure is no longer available' };
  }

  nextTurn.skippedClues = nextTurn.skippedClues.filter((clue) => clue.poolIndex !== selectedPoolIndex);
  if (
    nextTurn.currentSkippedCluePoolIndex !== null &&
    nextTurn.currentSkippedCluePoolIndex !== selectedPoolIndex
  ) {
    const activeSkippedClue = currentQueuedClue(nextTurn);
    if (activeSkippedClue) {
      nextTurn.skippedClues.push({
        poolIndex: activeSkippedClue.poolIndex,
        text: activeSkippedClue.text
      });
    }
  }

  const skippedIndex = nextTurn.clueQueue.findIndex((clue) => clue.poolIndex === selectedPoolIndex);
  if (skippedIndex === -1) {
    return { error: 'The skipped famous figure is no longer available' };
  }
  if (skippedIndex !== nextTurn.queueIndex) {
    const [skippedClue] = nextTurn.clueQueue.splice(skippedIndex, 1);
    if (!skippedClue) {
      return { error: "The skipped famous figure is no longer available" };
    }
    nextTurn.clueQueue.splice(nextTurn.queueIndex, 0, skippedClue);
  }

  nextTurn.currentSkippedCluePoolIndex = selectedPoolIndex;
  return syncSkipState(nextTurn, session.settings.skipsPerTurn);
};

const finishActionIfNeeded = (
  session: HatGameSession,
  activeTurn: ActiveTurn,
  runtime: ActionRuntime
): HatGameActionResult => {
  if (currentQueuedClue(activeTurn)) {
    return { ...session, activeTurn };
  }
  if (session.phaseNumber < 3) {
    return advancePhaseWithinTurn({ ...session, activeTurn }, activeTurn, runtime);
  }
  return finishTurn({ ...session, activeTurn });
};

const buildActionRuntime = (options: {
  rng?: () => number;
  nowMs?: () => number;
  toIso?: (timestamp: number) => string;
  makeTimestamp?: () => string;
  isPast?: (timestamp: string) => boolean;
}): ActionRuntime => ({
  rng: options.rng ?? Math.random,
  nowMs: options.nowMs ?? Date.now,
  toIso: options.toIso ?? ((timestamp) => new Date(timestamp).toISOString()),
  makeTimestamp: options.makeTimestamp ?? (() => new Date().toISOString()),
  isPast: options.isPast ?? ((timestamp) => new Date(timestamp).getTime() <= Date.now())
});

/**
 * Mark / skip / return-skipped while `stage === 'turn'` and `activeTurn` exists.
 * Caller must ensure we are not handling start-turn or end-turn.
 */
const applyTurnInteractionAction = (
  session: HatGameSession,
  action: HatGameAction,
  runtime: ActionRuntime
): HatGameActionResult => {
  const activeTurn = session.activeTurn;
  if (!activeTurn) {
    return { error: 'The turn has not started yet' };
  }

  if (runtime.isPast(activeTurn.endsAt)) {
    return finishTurn(session);
  }

  const clue = currentQueuedClue(activeTurn);
  if (!clue) {
    return finishTurn(session);
  }

  if (action.type === 'mark-correct') {
    return finishActionIfNeeded(session, markCorrect(session, activeTurn, clue, runtime), runtime);
  }

  if (action.type === 'skip-clue') {
    const nextTurn = skipFigure(session, activeTurn, clue, runtime);
    if ('error' in nextTurn) {
      return nextTurn;
    }
    return finishActionIfNeeded(session, nextTurn, runtime);
  }

  if (action.type === 'return-skipped-clue') {
    const nextTurn = returnSkippedFigure(session, activeTurn, action.payload?.poolIndex);
    if ('error' in nextTurn) {
      return nextTurn;
    }
    return finishActionIfNeeded(session, nextTurn, runtime);
  }

  return { ...session, activeTurn };
};

export const createHatGameSession = ({
  players,
  teams,
  config = GAME_DEFAULTS,
  clueSubmissions,
  rng = Math.random
}: {
  players: Player[];
  teams: Team[];
  config?: HatGameConfig;
  clueSubmissions: ClueSubmissionMap;
  rng?: () => number;
}): HatGameSession => {
  const settings: HatGameSettings = {
    teamCount: teams.length,
    turnDurationSeconds: config.turnDurationSeconds,
    cluesPerPlayer: config.cluesPerPlayer,
    skipsPerTurn: config.skipsPerTurn
  };
  const nextTeams = teams.map((team) => ({ ...team, score: 0 }));
  const teamOrder = nextTeams.map((team) => team.id);

  return {
    players: sortPlayersBySeat(players),
    teams: nextTeams,
    settings,
    stage: 'ready',
    roundNumber: 1,
    phaseNumber: 1,
    teamOrder,
    teamIndex: 0,
    describerIndexes: Object.fromEntries(teamOrder.map((teamId) => [teamId, 0])),
    cluePool: shuffleArray(buildHatGameCluePool(players, clueSubmissions), rng),
    usedCluePoolIndices: [],
    lastSeenCluePoolIndex: null,
    activeTurn: null,
    lastTurnSummary: null,
    bestTurnSummary: null,
    results: null
  };
};

export const applyHatGameAction = (
  session: HatGameSession,
  action: HatGameAction,
  options: {
    rng?: () => number;
    nowMs?: () => number;
    toIso?: (timestamp: number) => string;
    makeTimestamp?: () => string;
    isPast?: (timestamp: string) => boolean;
  } = {}
): HatGameActionResult => {
  const runtime = buildActionRuntime(options);

  if (action.type === 'start-turn') {
    return startTurn(session, runtime);
  }

  if (action.type === 'end-turn') {
    if (session.stage !== 'turn' || !session.activeTurn) {
      return { error: 'There is no active turn to end' };
    }
    return finishTurn(session);
  }

  if (action.type === 'view-results') {
    if (session.stage !== 'finalSummary') {
      return { error: 'Final scores are only available after the last turn.' };
    }
    return {
      ...session,
      stage: 'results',
    };
  }

  if (session.stage !== 'turn' || !session.activeTurn) {
    return { error: 'The turn has not started yet' };
  }

  return applyTurnInteractionAction(session, action, runtime);
};
