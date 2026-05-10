/**
 * Shared pass-and-play team roster limits (WhoWhatWhere + Hat Game).
 */
export const TEAM_COUNT_OPTIONS = [2, 3, 4] as const;
export type SharedTeamCount = (typeof TEAM_COUNT_OPTIONS)[number];

export const MIN_PLAYERS_PER_TEAM = 2;
export const MAX_PLAYERS_PER_TEAM = 6;

/** One-line hint for setup screens (team count + per-team roster range). */
export function teamCountRosterHint(teamCount: number) {
  return `${teamCount} teams · ${MIN_PLAYERS_PER_TEAM}–${MAX_PLAYERS_PER_TEAM} players each`;
}
