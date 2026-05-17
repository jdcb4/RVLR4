import type { ReactNode } from "react";

import { BetweenTurnsLayout } from "@/components/game/BetweenTurnsLayout";
import { GamePanel } from "@/components/game/GamePanel";
import { ReadyNextStepsCard } from "@/components/game/ReadyNextStepsCard";
import { ReadyProgressCard } from "@/components/game/ReadyProgressCard";
import { PlayerAvatarBadge } from "@/components/PlayerAvatar";
import { getActiveContext } from "@/domain/whowhatwhere/game";
import type { MatchState } from "@/domain/whowhatwhere/types";
import { LastTurnCard } from "@/features/whowhatwhere/summary/LastTurnCard";
import { Scoreboard } from "@/features/whowhatwhere/summary/Scoreboard";
import type { WhoWhatWherePeerRole } from "@/multiplayer/roomTypes";
import { multiplayerUpNextHeadingTitle } from "@/multiplayer/upNextHeading";

export function ReadyScreen({
  match,
  error,
  handoffRevealed,
  presentation = "passAndPlay",
  viewerPlayerId,
  viewerRole,
}: {
  readonly match: MatchState;
  readonly error: string;
  readonly handoffRevealed: boolean;
  readonly presentation?: "passAndPlay" | "multiplayer";
  /** Multiplayer only — drives shared between-rounds layout copy. */
  readonly viewerPlayerId?: string;
  readonly viewerRole?: WhoWhatWherePeerRole;
}) {
  const context = getActiveContext(match);
  const describerName = context.describer.name;
  const nextTeamName = context.team.name;

  const viewerTeamId =
    presentation === "multiplayer" && viewerPlayerId
      ? match.players.find((player) => player.id === viewerPlayerId)?.teamId
      : undefined;
  const viewerOnNextTeam = Boolean(viewerTeamId && viewerTeamId === context.team.id);

  const upNextPanel =
    presentation === "multiplayer" && viewerPlayerId ? (
      <GamePanel
        title={multiplayerUpNextHeadingTitle({
          viewerPlayerId,
          viewerTeamId,
          nextTeamId: context.team.id,
          nextDescriberPlayerId: context.describer.id,
          nextTeamDisplayName: nextTeamName,
        })}
      >
        <PlayerAvatarBadge
          avatarId={context.describer.avatarId}
          detail={`${context.team.name} describer`}
          name={describerName}
        />
      </GamePanel>
    ) : viewerOnNextTeam ? (
      <GamePanel title="Your team is up next" />
    ) : (
      <GamePanel title={`${nextTeamName} is up next`} />
    );

  let nextStepsPrimary: ReactNode;
  let nextStepsGivePhone: ReactNode | undefined;

  if (presentation === "multiplayer" && viewerRole) {
    if (viewerRole === "describer") {
      nextStepsPrimary = (
        <>
          It&apos;s your turn. When you&apos;re ready, tap <strong>Start turn</strong> in the
          footer.
        </>
      );
    } else if (viewerOnNextTeam) {
      nextStepsPrimary = (
        <>
          Your team is up now. Get ready to guess when{" "}
          <span className="font-semibold text-foreground">{describerName}</span> starts the turn.
        </>
      );
    } else {
      nextStepsPrimary = (
        <>
          <span className="font-semibold text-foreground">{nextTeamName}</span> is up next.
          Waiting for{" "}
          <span className="font-semibold text-foreground">{describerName}</span> to start the turn.
        </>
      );
    }
    nextStepsGivePhone = undefined;
  } else if (presentation === "multiplayer") {
    /** Multiplayer without role (should not happen) — safe fallback. */
    nextStepsPrimary = handoffRevealed
      ? "Describe words privately until the timer ends — use your footer controls."
      : `${describerName} taps “${describerName} Ready” once teammates look away from their screens.`;
    nextStepsGivePhone = handoffRevealed ? (
      <>
        <span className="font-semibold text-foreground">{describerName}</span> is describing on
        their device.
      </>
    ) : (
      <>
        Only{" "}
        <span className="font-semibold text-foreground">{describerName}</span> should peek when words
        appear.
      </>
    );
  } else {
    nextStepsPrimary = handoffRevealed
      ? "Start the timer from the footer when everyone is ready."
      : `${describerName} taps “${describerName} Ready” in the footer when everyone else is looking away.`;
    nextStepsGivePhone = handoffRevealed ? (
      <>
        <span className="font-semibold text-foreground">{describerName}</span> has the phone.
      </>
    ) : (
      <>
        Give the phone to{" "}
        <span className="font-semibold text-foreground">{describerName}</span>.
      </>
    );
  }

  return (
    <BetweenTurnsLayout
      heading={upNextPanel}
      lastTurnCard={<LastTurnCard summary={match.lastTurnSummary} />}
      nextSteps={
        <ReadyNextStepsCard givePhoneLine={nextStepsGivePhone} primaryText={nextStepsPrimary} />
      }
      progressCard={
        <ReadyProgressCard label="Round">
          {Math.min(match.roundNumber, match.settings.totalRounds)} / {match.settings.totalRounds}
        </ReadyProgressCard>
      }
      scoreboard={<Scoreboard match={match} />}
      tail={
        error ? (
          <p className="rounded-md border border-semantic-destructive-border-soft bg-semantic-destructive-surface-soft p-3 text-typ-ui text-destructive">
            {error}
          </p>
        ) : null
      }
    />
  );
}
