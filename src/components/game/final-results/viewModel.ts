import type { HatGameResults, HatGameSession } from "@/domain/hat-game/types";
import type { MatchState } from "@/domain/whowhatwhere/types";

/** One row in the shared final leaderboard (sorted high → low). */
export type FinalLeaderboardRowVm = {
  readonly rank: number;
  readonly teamId: string;
  readonly teamName: string;
  readonly score: number;
  /** Row is one of the declared winner team ids (tie or solo). */
  readonly isWinner: boolean;
};

export type FinalBestTurnVm = {
  readonly playerName: string;
  readonly teamName: string;
  readonly score: number;
};

export type FinalResultsViewModel = {
  readonly heroHeadline: string;
  readonly heroSubline: string | undefined;
  readonly isTie: boolean;
  readonly leaderboardRows: readonly FinalLeaderboardRowVm[];
  readonly bestTurn: FinalBestTurnVm | null;
};

type SharedLeaderboardEntry = {
  readonly teamId: string;
  readonly teamName: string;
  readonly score: number;
};

type SharedResults = {
  readonly leaderboard: readonly SharedLeaderboardEntry[];
  readonly winnerTeamIds: readonly string[];
  readonly isTie: boolean;
};

function sortedLeaderboard<T extends SharedLeaderboardEntry>(entries: readonly T[]): T[] {
  return [...entries].sort((left, right) => right.score - left.score);
}

/**
 * Shared final-results mapper for any game with a leaderboard + optional
 * best-turn. WWW and Hat both produce the same podium layout — they only
 * differ in which field on `bestTurn` holds the score (`scoreDelta` vs
 * `score`), so callers supply the resolved best-turn VM directly.
 */
function buildFinalResultsVm(
  results: SharedResults,
  bestTurn: FinalBestTurnVm | null,
): FinalResultsViewModel {
  const ordered = sortedLeaderboard(results.leaderboard);
  const leaderboardRows: FinalLeaderboardRowVm[] = ordered.map((entry, index) => ({
    rank: index + 1,
    teamId: entry.teamId,
    teamName: entry.teamName,
    score: entry.score,
    isWinner: results.winnerTeamIds.includes(entry.teamId),
  }));

  const winnerLabels = ordered
    .filter((entry) => results.winnerTeamIds.includes(entry.teamId))
    .map((entry) => entry.teamName);

  let heroHeadline: string;
  let heroSubline: string | undefined;

  if (results.isTie) {
    heroHeadline = "It's a tie!";
    heroSubline = winnerLabels.length > 0 ? winnerLabels.join(" · ") : "Shared top score";
  } else {
    heroHeadline = winnerLabels[0] ?? "Winner";
    heroSubline = winnerLabels.length > 1 ? winnerLabels.slice(1).join(" · ") : undefined;
  }

  return {
    heroHeadline,
    heroSubline,
    isTie: results.isTie,
    leaderboardRows,
    bestTurn,
  };
}

/** Maps Who What Where match results into the shared podium layout. */
export function mapFinalResultsFromWhoWhatWhere(match: MatchState): FinalResultsViewModel | null {
  const results = match.results;
  if (!results) {
    return null;
  }

  const bestTurn = results.bestTurn
    ? {
        playerName: results.bestTurn.describerName,
        teamName: results.bestTurn.teamName,
        score: results.bestTurn.scoreDelta,
      }
    : null;

  return buildFinalResultsVm(results, bestTurn);
}

/** True if this viewer's team is among WWW winners (for confetti on device). */
export function viewerWhoWhatWhereTeamIsWinner(match: MatchState, viewerPlayerId: string): boolean {
  const results = match.results;

  if (!results) {
    return false;
  }

  const teamId = match.players.find((player) => player.id === viewerPlayerId)?.teamId;

  if (!teamId) {
    return false;
  }

  return results.winnerTeamIds.includes(teamId);
}

/** Maps Hat Game session results into the same podium layout (no phase labels). */
export function mapFinalResultsFromHat(results: HatGameResults): FinalResultsViewModel {
  const bestTurn = results.bestTurn
    ? {
        playerName: results.bestTurn.describerName,
        teamName: results.bestTurn.teamName,
        score: results.bestTurn.score,
      }
    : null;

  return buildFinalResultsVm(results, bestTurn);
}

/** True if this viewer's Hat team is among winners (confetti on their device). */
export function viewerHatTeamIsWinner(session: HatGameSession, viewerPlayerId: string): boolean {
  const results = session.results;

  if (!results) {
    return false;
  }

  const teamId = session.players.find((player) => player.id === viewerPlayerId)?.teamId;

  if (!teamId) {
    return false;
  }

  return results.winnerTeamIds.includes(teamId);
}
