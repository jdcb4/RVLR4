/**
 * Sort teams by score (highest first) and map to a small display row shape.
 * Both games use the same row fields so results screens stay consistent.
 */
export type TeamScored = {
  id: string;
  name: string;
  score: number;
};

export type LeaderboardRow = {
  teamId: string;
  teamName: string;
  score: number;
};

export function buildLeaderboardRowsFromTeams(
  teams: readonly TeamScored[],
): LeaderboardRow[] {
  return [...teams]
    .sort((left, right) => right.score - left.score)
    .map((team) => ({
      teamId: team.id,
      teamName: team.name,
      score: team.score,
    }));
}
