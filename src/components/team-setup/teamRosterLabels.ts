/** Label for the shell footer primary button on per-team roster steps. */
export function teamRosterAdvanceLabel(
  teamIndex: number,
  teamCount: number,
  lastTeamPrimaryLabel: string,
): string {
  if (teamIndex >= teamCount - 1) {
    return lastTeamPrimaryLabel;
  }
  return `Next: Team ${teamIndex + 2}`;
}
