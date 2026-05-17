import { buildLeaderboardRowsFromTeams } from "../shared/teamLeaderboard";
import {
  normalizeName,
  TEAM_NAME_LIMIT,
  validateSetup,
} from "./setup";
import type {
  ActiveContext,
  ActiveTurn,
  GameSettings,
  LastTurnSummary,
  MatchState,
  Player,
  Results,
  SkippedWord,
  Team,
  TeamSetup,
  WordEntry,
  WordHistoryEntry,
} from "./types";
import { buildTurnDeck } from "./words";

export function createMatch(
  teams: readonly TeamSetup[],
  settings: GameSettings,
): MatchState {
  const errors = validateSetup(teams, settings);

  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  let seat = 0;
  const players: Player[] = [];
  const matchTeams: Team[] = teams.map((team, teamIndex) => {
    const teamId = `team-${teamIndex + 1}`;

    for (const [playerIndex, player] of team.players.entries()) {
      // Prefer stable IDs from setup (multi-device rooms pass lobby UUIDs through TeamSetup).
      const playerId =
        player.id.trim().length > 0 ? player.id.trim() : `player-${seat + 1}`;
      players.push({
        id: playerId,
        seat,
        name: normalizeName(
          player.name,
          `Player ${teamIndex + 1}.${playerIndex + 1}`,
        ),
        teamId,
        avatarId: player.avatarId,
      });
      seat += 1;
    }

    return {
      id: teamId,
      name: normalizeName(team.name, `Team ${teamIndex + 1}`, TEAM_NAME_LIMIT),
      score: 0,
    };
  });

  return {
    gameId: "whowhatwhere",
    players,
    teams: matchTeams,
    settings,
    stage: "ready",
    roundNumber: 1,
    teamOrder: matchTeams.map((team) => team.id),
    teamIndex: 0,
    describerIndexes: Object.fromEntries(matchTeams.map((team) => [team.id, 0])),
    activeTurn: null,
    lastTurnSummary: null,
    turnSummaries: [],
    results: null,
    wordReserves: {},
  };
}

export function getActiveContext(match: MatchState): ActiveContext {
  const teamId = match.teamOrder[match.teamIndex];
  const team = match.teams.find((item) => item.id === teamId);

  if (!team) {
    throw new Error("Active team is missing.");
  }

  const teamPlayers = match.players
    .filter((player) => player.teamId === team.id)
    .sort((left, right) => left.seat - right.seat);
  const describerIndex = match.describerIndexes[team.id] ?? 0;
  const describer = teamPlayers[describerIndex % teamPlayers.length];

  if (!describer) {
    throw new Error("Active describer is missing.");
  }

  return { team, teamPlayers, describer };
}

export function startTurn(
  match: MatchState,
  allWords: readonly WordEntry[],
  now = new Date(),
  random = Math.random,
): MatchState {
  if (match.stage !== "ready") {
    return match;
  }

  const deck = buildTurnDeck(allWords, match.settings, random);

  if (deck.words.length === 0) {
    throw new Error("Unable to start this turn.");
  }

  const startedAt = now.toISOString();
  const endsAt = new Date(
    now.getTime() + match.settings.turnDurationSeconds * 1000,
  ).toISOString();

  return {
    ...match,
    stage: "turn",
    activeTurn: {
      startedAt,
      endsAt,
      durationSeconds: match.settings.turnDurationSeconds,
      category: deck.category,
      wordQueue: deck.words,
      queueIndex: 0,
      currentWordSource: "main",
      currentSkippedWord: null,
      score: 0,
      correctCount: 0,
      skippedCount: 0,
      skipLimit: match.settings.skipLimit,
      skippedWords: [],
      nextSkippedWordId: 1,
      wordHistory: [],
      hintsRemaining: match.settings.hints.perTurnLimit,
      currentWordHintRevealed: false,
    },
    wordReserves: {
      ...match.wordReserves,
      [deck.category]: deck.reserveWords,
    },
  };
}

export function getCurrentWord(activeTurn: ActiveTurn | null) {
  if (!activeTurn) {
    return null;
  }

  if (activeTurn.currentWordSource === "skipped") {
    return activeTurn.currentSkippedWord?.word ?? null;
  }

  return activeTurn.wordQueue[activeTurn.queueIndex] ?? null;
}

export function getSecondsLeft(activeTurn: ActiveTurn, now = new Date()) {
  return Math.max(
    0,
    Math.ceil((Date.parse(activeTurn.endsAt) - now.getTime()) / 1000),
  );
}

export function isTurnExpired(activeTurn: ActiveTurn, now = new Date()) {
  return getSecondsLeft(activeTurn, now) <= 0;
}

export function canQueueSkipped(activeTurn: ActiveTurn) {
  return (
    activeTurn.skipLimit < 0 || activeTurn.skippedWords.length < activeTurn.skipLimit
  );
}

export function correctWord(match: MatchState, now = new Date()): MatchState {
  const liveTurn = getLiveTurn(match, now);

  if (liveTurn.status === "done") {
    return liveTurn.match;
  }

  const word = getCurrentWord(liveTurn.activeTurn);

  if (!word) {
    return endTurn(match);
  }

  const activeTurn = liveTurn.activeTurn;
  const historyEntry = createHistoryEntry(activeTurn, word, "correct", now);
  const nextTurn: ActiveTurn = {
    ...activeTurn,
    score: activeTurn.score + 1,
    correctCount: activeTurn.correctCount + 1,
    wordHistory: [...activeTurn.wordHistory, historyEntry],
    currentSkippedWord:
      activeTurn.currentWordSource === "skipped"
        ? null
        : activeTurn.currentSkippedWord,
    currentWordSource: "main",
    queueIndex:
      activeTurn.currentWordSource === "main"
        ? activeTurn.queueIndex + 1
        : activeTurn.queueIndex,
    currentWordHintRevealed: false,
  };

  return primeNextWord({ ...match, activeTurn: nextTurn });
}

export function skipWord(match: MatchState, now = new Date()): MatchState {
  const liveTurn = getLiveTurn(match, now);

  if (liveTurn.status === "done") {
    return liveTurn.match;
  }

  if (!canQueueSkipped(liveTurn.activeTurn)) {
    return match;
  }

  const word = getCurrentWord(liveTurn.activeTurn);

  if (!word) {
    return endTurn(match);
  }

  const activeTurn = liveTurn.activeTurn;
  const historyEntry = createHistoryEntry(activeTurn, word, "skipped", now);

  if (activeTurn.currentWordSource === "skipped" && activeTurn.currentSkippedWord) {
    return primeNextWord({
      ...match,
      activeTurn: {
        ...activeTurn,
        skippedCount: activeTurn.skippedCount + 1,
        wordHistory: [...activeTurn.wordHistory, historyEntry],
        skippedWords: [...activeTurn.skippedWords, activeTurn.currentSkippedWord],
        currentSkippedWord: null,
        currentWordSource: "main",
        currentWordHintRevealed: false,
      },
    });
  }

  const skippedWord: SkippedWord = {
    id: `skip-${activeTurn.nextSkippedWordId}`,
    word,
  };

  return primeNextWord({
    ...match,
    activeTurn: {
      ...activeTurn,
      skippedCount: activeTurn.skippedCount + 1,
      wordHistory: [...activeTurn.wordHistory, historyEntry],
      skippedWords: [...activeTurn.skippedWords, skippedWord],
      nextSkippedWordId: activeTurn.nextSkippedWordId + 1,
      queueIndex: activeTurn.queueIndex + 1,
      currentWordSource: "main",
      currentWordHintRevealed: false,
    },
  });
}

export function returnSkippedWord(
  match: MatchState,
  skippedWordId?: string,
): MatchState {
  if (!match.activeTurn || match.stage !== "turn") {
    return match;
  }

  const activeTurn = match.activeTurn;
  const available = [
    ...(activeTurn.currentSkippedWord ? [activeTurn.currentSkippedWord] : []),
    ...activeTurn.skippedWords,
  ];
  const target =
    available.find((item) => item.id === skippedWordId) ?? available[0] ?? null;

  if (!target) {
    return match;
  }

  const waitingWithoutTarget = activeTurn.skippedWords.filter(
    (item) => item.id !== target.id,
  );
  const shouldReturnCurrent =
    activeTurn.currentSkippedWord &&
    activeTurn.currentSkippedWord.id !== target.id;

  return {
    ...match,
    activeTurn: {
      ...activeTurn,
      currentWordSource: "skipped",
      currentSkippedWord: target,
      skippedWords: shouldReturnCurrent
        ? [...waitingWithoutTarget, activeTurn.currentSkippedWord!]
        : waitingWithoutTarget,
      currentWordHintRevealed: false,
    },
  };
}

/**
 * Reveal the hint for the current word, consuming one of this turn's hint slots.
 * No-op when:
 * - no turn is running,
 * - all hints have already been used this turn,
 * - the hint for the current word is already revealed (idempotent on double-tap),
 * - or there is no current word to hint.
 */
export function revealHint(match: MatchState): MatchState {
  if (match.stage !== "turn" || !match.activeTurn) {
    return match;
  }

  const activeTurn = match.activeTurn;

  if (activeTurn.currentWordHintRevealed || activeTurn.hintsRemaining <= 0) {
    return match;
  }

  if (!getCurrentWord(activeTurn)) {
    return match;
  }

  return {
    ...match,
    activeTurn: {
      ...activeTurn,
      hintsRemaining: activeTurn.hintsRemaining - 1,
      currentWordHintRevealed: true,
    },
  };
}

export function endTurn(match: MatchState): MatchState {
  if (!match.activeTurn) {
    return match.stage === "turn" ? { ...match, stage: "ready" } : match;
  }

  const { team, teamPlayers, describer } = getActiveContext(match);
  const activeTurn = match.activeTurn;
  const finalWord = getCurrentWord(activeTurn);
  const updatedTeams = match.teams.map((item) =>
    item.id === team.id ? { ...item, score: item.score + activeTurn.score } : item,
  );
  const lastTurnSummary: LastTurnSummary = {
    teamId: team.id,
    teamName: team.name,
    describerId: describer.id,
    describerName: describer.name,
    scoreDelta: activeTurn.score,
    correctCount: activeTurn.correctCount,
    skippedCount: activeTurn.skippedCount,
    pendingSkippedCount:
      activeTurn.skippedWords.length + (activeTurn.currentSkippedWord ? 1 : 0),
    wordHistory: activeTurn.wordHistory,
    finalWord,
  };
  const turnSummaries = [...match.turnSummaries, lastTurnSummary];
  const nextDescriberIndex =
    ((match.describerIndexes[team.id] ?? 0) + 1) % teamPlayers.length;
  let nextTeamIndex = match.teamIndex + 1;
  let nextRoundNumber = match.roundNumber;

  if (nextTeamIndex >= match.teamOrder.length) {
    nextTeamIndex = 0;
    nextRoundNumber += 1;
  }

  const baseMatch: MatchState = {
    ...match,
    teams: updatedTeams,
    describerIndexes: {
      ...match.describerIndexes,
      [team.id]: nextDescriberIndex,
    },
    teamIndex: nextTeamIndex,
    roundNumber: nextRoundNumber,
    activeTurn: null,
    lastTurnSummary,
    turnSummaries,
  };

  if (nextRoundNumber > match.settings.totalRounds) {
    return {
      ...baseMatch,
      stage: "finalSummary",
      results: buildResults(updatedTeams, turnSummaries),
    };
  }

  return {
    ...baseMatch,
    stage: "ready",
  };
}

function buildResults(
  teams: readonly Team[],
  turnSummaries: readonly LastTurnSummary[] = [],
): Results {
  const leaderboard = buildLeaderboardRowsFromTeams(teams);
  const topScore = leaderboard[0]?.score ?? 0;
  const winnerTeamIds = leaderboard
    .filter((entry) => entry.score === topScore)
    .map((entry) => entry.teamId);

  return {
    leaderboard,
    winnerTeamIds,
    isTie: winnerTeamIds.length > 1,
    bestTurn: buildBestTurn(turnSummaries),
  };
}

export function showResults(match: MatchState): MatchState {
  if (match.stage !== "finalSummary") {
    return match;
  }

  return {
    ...match,
    stage: "results",
  };
}

function buildBestTurn(turnSummaries: readonly LastTurnSummary[]) {
  const bestTurn = [...turnSummaries].sort(
    (left, right) => right.scoreDelta - left.scoreDelta,
  )[0];

  return bestTurn
    ? {
        teamId: bestTurn.teamId,
        teamName: bestTurn.teamName,
        describerId: bestTurn.describerId,
        describerName: bestTurn.describerName,
        scoreDelta: bestTurn.scoreDelta,
      }
    : null;
}

function getLiveTurn(
  match: MatchState,
  now: Date,
):
  | { readonly status: "active"; readonly activeTurn: ActiveTurn }
  | { readonly status: "done"; readonly match: MatchState } {
  if (!match.activeTurn || match.stage !== "turn") {
    return { status: "done", match };
  }

  if (isTurnExpired(match.activeTurn, now)) {
    return { status: "done", match: endTurn(match) };
  }

  return { status: "active", activeTurn: match.activeTurn };
}

function primeNextWord(match: MatchState): MatchState {
  const activeTurn = match.activeTurn;

  if (!activeTurn) {
    return match;
  }

  if (activeTurn.currentWordSource === "main") {
    const remainingMainWords = activeTurn.wordQueue.length - activeTurn.queueIndex;
    const categoryReserves = match.wordReserves[activeTurn.category] ?? [];

    if (remainingMainWords < 10 && categoryReserves.length > 0) {
      const nextWords = categoryReserves.slice(0, 30);
      const remainingReserves = categoryReserves.slice(30);

      return primeNextWord({
        ...match,
        activeTurn: {
          ...activeTurn,
          wordQueue: [...activeTurn.wordQueue, ...nextWords],
        },
        wordReserves: {
          ...match.wordReserves,
          [activeTurn.category]: remainingReserves,
        },
      });
    }
  }

  if (getCurrentWord(activeTurn)) {
    return match;
  }

  const nextSkipped = activeTurn.skippedWords[0];

  if (nextSkipped) {
    return {
      ...match,
      activeTurn: {
        ...activeTurn,
        currentWordSource: "skipped",
        currentSkippedWord: nextSkipped,
        skippedWords: activeTurn.skippedWords.slice(1),
      },
    };
  }

  return endTurn(match);
}

function createHistoryEntry(
  activeTurn: ActiveTurn,
  word: WordEntry,
  status: WordHistoryEntry["status"],
  now: Date,
): WordHistoryEntry {
  return {
    word,
    status,
    source: activeTurn.currentWordSource,
    timestamp: now.toISOString(),
  };
}
