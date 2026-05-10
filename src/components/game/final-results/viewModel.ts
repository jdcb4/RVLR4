import type { HatGameResults } from "@/domain/hat-game/types";
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

function sortedLeaderboard<T extends { teamId: string; teamName: string; score: number }>(
  entries: readonly T[],
): T[] {
  return [...entries].sort((left, right) => right.score - left.score);
}

/** Maps Who What Where match results into the shared podium layout. */
export function mapFinalResultsFromWww(match: MatchState): FinalResultsViewModel | null {
  const results = match.results;
  if (!results) {
    return null;
  }

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
    heroSubline =
      winnerLabels.length > 0 ? winnerLabels.join(" · ") : "Shared top score";
  } else {
    heroHeadline = winnerLabels[0] ?? "Winner";
    heroSubline = winnerLabels.length > 1 ? winnerLabels.slice(1).join(" · ") : undefined;
  }

  const bestTurn = results.bestTurn
    ? {
        playerName: results.bestTurn.describerName,
        teamName: results.bestTurn.teamName,
        score: results.bestTurn.scoreDelta,
      }
    : null;

  return {
    heroHeadline,
    heroSubline,
    isTie: results.isTie,
    leaderboardRows,
    bestTurn,
  };
}

/** Maps Hat Game session results into the same podium layout (no phase labels). */
export function mapFinalResultsFromHat(results: HatGameResults): FinalResultsViewModel {
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
    heroSubline =
      winnerLabels.length > 0 ? winnerLabels.join(" · ") : "Shared top score";
  } else {
    heroHeadline = winnerLabels[0] ?? "Winner";
    heroSubline = winnerLabels.length > 1 ? winnerLabels.slice(1).join(" · ") : undefined;
  }

  const bestTurn = results.bestTurn
    ? {
        playerName: results.bestTurn.describerName,
        teamName: results.bestTurn.teamName,
        score: results.bestTurn.score,
      }
    : null;

  return {
    heroHeadline,
    heroSubline,
    isTie: results.isTie,
    leaderboardRows,
    bestTurn,
  };
}
