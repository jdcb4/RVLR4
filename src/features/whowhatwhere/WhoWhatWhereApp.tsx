import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  AppInfoHeaderButton,
  AppInfoOverlay,
} from "@/components/AppInfoOverlay";
import { FooterActionLockContext } from "@/components/footerActionLockContext";
import {
  PrimaryFooterButton,
  SecondaryFooterButton,
} from "@/components/game/GameFooterButtons";
import { GameScreenHeaderActions } from "@/components/game/GameScreenHeaderActions";
import { GameResultActions } from "@/components/GameResultActions";
import { GameShell } from "@/components/GameShell";
import { IconCheck, IconSkipForward } from "@/components/icons";
import { teamRosterAdvanceLabel } from "@/components/team-setup/teamRosterLabels";
import { canQueueSkipped, getActiveContext } from "@/domain/whowhatwhere/game";
import { FinalTurnRecapScreen } from "@/features/whowhatwhere/results/FinalTurnRecapScreen";
import { ResultsScreen } from "@/features/whowhatwhere/results/ResultsScreen";
import { SettingsScreen } from "@/features/whowhatwhere/setup/SettingsScreen";
import { TeamSetupScreen } from "@/features/whowhatwhere/setup/TeamSetupScreen";
import { WwwReviewTeamsScreen } from "@/features/whowhatwhere/setup/WwwReviewTeamsScreen";
import { ActiveTurnScreen } from "@/features/whowhatwhere/turn/ActiveTurnScreen";
import { ReadyScreen } from "@/features/whowhatwhere/turn/ReadyScreen";
import { useGameController } from "@/features/whowhatwhere/useGameController";
import { WwwLandingScreen } from "@/features/whowhatwhere/WwwLandingScreen";

import packageJson from "../../../package.json";

export function WhoWhatWhereApp() {
  const navigate = useNavigate();
  const game = useGameController();
  const [showAppInfo, setShowAppInfo] = useState(false);

  useEffect(() => {
    if (!showAppInfo) {
      return undefined;
    }
    const timeout = setTimeout(() => setShowAppInfo(false), 5000);
    return () => clearTimeout(timeout);
  }, [showAppInfo]);

  const showEndTurn =
    !game.pendingMatch &&
    game.match &&
    game.activeMode === "turn" &&
    Boolean(game.match.activeTurn);

  const headerRight = (
    <GameScreenHeaderActions
      {...(showEndTurn ? { endTurn: { onClick: game.endTurn } } : {})}
      trailing={
        <AppInfoHeaderButton onClick={() => setShowAppInfo(true)} />
      }
    />
  );

  const wrap = (node: ReactNode) => (
    <div className="flex w-full flex-col gap-2">{node}</div>
  );

  let footer: ReactNode | undefined;

  if (game.activeMode === "landing") {
    if (game.confirmDiscardPending) {
      footer = wrap(
        <>
          <SecondaryFooterButton
            label="Cancel"
            onClick={() => game.setConfirmDiscardPending(false)}
          />
          <PrimaryFooterButton
            label="Discard saved game"
            onClick={game.startOverFromPendingMatch}
          />
        </>,
      );
    } else if (game.pendingMatch) {
      footer = wrap(
        <PrimaryFooterButton
          label="Start new game"
          onClick={() => game.setConfirmDiscardPending(true)}
        />,
      );
    } else {
      footer = wrap(
        <PrimaryFooterButton
          label="Start game"
          onClick={game.goToSettingsFromLanding}
        />,
      );
    }
  } else if (game.activeMode === "settings") {
    footer = wrap(
      <PrimaryFooterButton label="Next: Team 1" onClick={game.goToTeamSetup} />,
    );
  } else if (game.activeMode === "team") {
    footer = wrap(
      <PrimaryFooterButton
        label={teamRosterAdvanceLabel(
          game.teamStep,
          game.settings.teamCount,
          "Finalise teams",
        )}
        onClick={game.advanceTeamSetup}
      />,
    );
  } else if (game.activeMode === "review") {
    footer = wrap(
      <>
        <SecondaryFooterButton
          label="Edit teams"
          onClick={game.leaveReviewToTeamSetup}
        />
        <PrimaryFooterButton
          label="Start the game"
          onClick={game.startRoundFromReview}
        />
      </>,
    );
  } else if (game.match && game.activeMode === "ready") {
    const readyDescriberName = getActiveContext(game.match).describer.name;
    footer = wrap(
      game.readyHandoffRevealed ? (
        <PrimaryFooterButton
          disabled={game.isStartingTurn}
          label={game.isStartingTurn ? "Loading words" : "Start turn"}
          onClick={() => void game.startNextTurn()}
        />
      ) : (
        <PrimaryFooterButton
          label={`${readyDescriberName} Ready`}
          onClick={() => game.setReadyHandoffRevealed(true)}
        />
      ),
    );
  } else if (
    game.activeMode === "turn" &&
    game.match?.activeTurn
  ) {
    const activeTurn = game.match.activeTurn;
    footer = wrap(
      <>
        <SecondaryFooterButton
          disabled={!canQueueSkipped(activeTurn)}
          icon={<IconSkipForward className="size-5" />}
          label="Skip"
          onClick={game.skip}
        />
        <PrimaryFooterButton
          icon={<IconCheck className="size-5" />}
          label="Correct"
          onClick={game.correct}
        />
      </>,
    );
  } else if (game.match && game.activeMode === "finalSummary") {
    footer = wrap(
      <PrimaryFooterButton label="Final scores" onClick={game.viewResults} />,
    );
  } else if (game.match && game.activeMode === "results") {
    footer = wrap(
      <GameResultActions
        onNewGame={game.backToSetup}
        onPickAnotherGame={() => navigate("/")}
        onReplay={game.playAgain}
      />,
    );
  }

  return (
    <FooterActionLockContext.Provider value={game.footerActionsLocked}>
      <GameShell footer={footer} headerRight={headerRight} title="Who What Where">
        <AppInfoOverlay
          open={showAppInfo}
          version={packageJson.version}
          onClose={() => setShowAppInfo(false)}
        />

        {game.activeMode === "landing" ? (
          <WwwLandingScreen
            confirmDiscardPending={game.confirmDiscardPending}
            pendingMatch={game.pendingMatch}
            onResume={game.resumePendingMatch}
          />
        ) : null}

        {game.activeMode === "settings" ? (
          <SettingsScreen
            settings={game.settings}
            onChange={game.updateSettings}
          />
        ) : null}

        {game.activeMode === "team" ? (
          <TeamSetupScreen
            error={game.setupError}
            settings={game.settings}
            teamIndex={game.teamStep}
            teams={game.teamSetups}
            onBack={game.goBackFromTeamSetup}
            onTeamsChange={game.setTeamSetups}
          />
        ) : null}

        {game.activeMode === "review" ? (
          <WwwReviewTeamsScreen teams={game.teamSetups} />
        ) : null}

        {!game.pendingMatch &&
        game.match &&
        game.activeMode === "ready" ? (
          <ReadyScreen
            key={`${game.match.roundNumber}-${game.match.teamIndex}`}
            error={game.turnError}
            handoffRevealed={game.readyHandoffRevealed}
            match={game.match}
          />
        ) : null}

        {!game.pendingMatch &&
        game.match &&
        game.activeMode === "turn" &&
        game.match.activeTurn ? (
          <ActiveTurnScreen
            match={game.match}
            onReturnSkipped={game.returnSkipped}
          />
        ) : null}

        {!game.pendingMatch &&
        game.match &&
        game.activeMode === "finalSummary" ? (
          <FinalTurnRecapScreen match={game.match} />
        ) : null}

        {!game.pendingMatch &&
        game.match &&
        game.activeMode === "results" ? (
          <ResultsScreen match={game.match} />
        ) : null}
      </GameShell>
    </FooterActionLockContext.Provider>
  );
}
