/**
 * Short heading for “who is up next” in multiplayer Hat / Who What Where ready screens.
 *
 * - Next describer: personal call-out.
 * - Same team, not that describer: bench is rotating in.
 * - Everyone else: neutral team name.
 */
export function multiplayerUpNextHeadingTitle(args: {
  readonly viewerPlayerId: string;
  readonly viewerTeamId: string | null | undefined;
  readonly nextTeamId: string | null | undefined;
  readonly nextDescriberPlayerId: string | null | undefined;
  readonly nextTeamDisplayName: string;
}): string {
  const { viewerPlayerId, viewerTeamId, nextTeamId, nextDescriberPlayerId, nextTeamDisplayName } =
    args;

  if (nextDescriberPlayerId && viewerPlayerId === nextDescriberPlayerId) {
    return "You're up next";
  }

  if (
    viewerTeamId &&
    nextTeamId &&
    viewerTeamId === nextTeamId &&
    viewerPlayerId !== nextDescriberPlayerId
  ) {
    return "Your team is up next";
  }

  return `${nextTeamDisplayName} is up next`;
}
