import type { ReactNode } from "react";

import { PrimaryFooterButton, SecondaryFooterButton } from "@/components/game/GameFooterButtons";
import { PassAndPlayGameResultActions } from "@/components/GameResultActions";
import { IconCheck, IconSkipForward } from "@/components/icons";
import { teamRosterAdvanceLabel } from "@/components/team-setup/teamRosterLabels";
import { canQueueSkipped, getActiveContext } from "@/domain/whowhatwhere/game";
import { FinalTurnRecapScreen } from "@/features/whowhatwhere/results/FinalTurnRecapScreen";
import { ResultsScreen } from "@/features/whowhatwhere/results/ResultsScreen";
import { SettingsScreen } from "@/features/whowhatwhere/setup/SettingsScreen";
import { TeamSetupScreen } from "@/features/whowhatwhere/setup/TeamSetupScreen";
import { WhoWhatWhereReviewTeamsScreen } from "@/features/whowhatwhere/setup/WhoWhatWhereReviewTeamsScreen";
import { ActiveTurnScreen } from "@/features/whowhatwhere/turn/ActiveTurnScreen";
import { WhoWhatWhereDeviceReady } from "@/features/whowhatwhere/turn/WhoWhatWhereDeviceReady";
import type { WhoWhatWhereSingleplayerController } from "@/features/whowhatwhere/useWhoWhatWhereSingleplayerApp";
import { WhoWhatWhereLandingScreen } from "@/features/whowhatwhere/WhoWhatWhereLandingScreen";

function FooterStack({ children }: { readonly children: ReactNode }) {
  return <div className="flex w-full flex-col gap-2">{children}</div>;
}

export function WhoWhatWhereFooter({
  game,
  onPickAnotherGame,
}: {
  readonly game: WhoWhatWhereSingleplayerController;
  readonly onPickAnotherGame: () => void;
}) {
  if (game.loaded === false) return null;
  if (game.storageError) {
    if (game.hydrationFailed && game.confirmDiscardPending) {
      return (
        <FooterStack>
          <SecondaryFooterButton
            label="Cancel"
            onClick={() => game.setConfirmDiscardPending(false)}
          />
          <PrimaryFooterButton
            label="Discard saved game"
            onClick={() => void game.discardUnavailableSave()}
          />
        </FooterStack>
      );
    }
    return (
      <FooterStack>
        <PrimaryFooterButton
          label={game.hydrationFailed ? "Retry loading" : "Retry saving"}
          onClick={() => void game.retrySave()}
        />
        {game.hydrationFailed ? (
          <SecondaryFooterButton
            label="Discard saved game"
            onClick={() => game.setConfirmDiscardPending(true)}
          />
        ) : null}
      </FooterStack>
    );
  }
  if (game.paused) {
    return (
      <FooterStack>
        <PrimaryFooterButton
          label={game.match?.stage === "turn" ? "Resume turn" : "Continue"}
          onClick={() => void game.resumeGame()}
        />
        <SecondaryFooterButton label="Save and leave" onClick={onPickAnotherGame} />
      </FooterStack>
    );
  }
  if (game.activeMode === "landing") {
    return (
      <LandingFooter
        confirmDiscardPending={game.confirmDiscardPending}
        hasPendingMatch={Boolean(game.pendingMatch)}
        onCancelDiscard={() => game.setConfirmDiscardPending(false)}
        onConfirmDiscard={game.startOverFromPendingMatch}
        onRequestDiscard={() => game.setConfirmDiscardPending(true)}
        onStartGame={game.goToSettingsFromLanding}
      />
    );
  }

  if (game.activeMode === "settings") {
    return (
      <FooterStack>
        <PrimaryFooterButton label="Next: Team 1" onClick={game.goToTeamSetup} />
      </FooterStack>
    );
  }

  if (game.activeMode === "team") {
    return (
      <FooterStack>
        <PrimaryFooterButton
          label={teamRosterAdvanceLabel(game.teamStep, game.settings.teamCount, "Finalise teams")}
          onClick={game.advanceTeamSetup}
        />
      </FooterStack>
    );
  }

  if (game.activeMode === "review") {
    return (
      <FooterStack>
        <SecondaryFooterButton label="Edit teams" onClick={game.leaveReviewToTeamSetup} />
        <PrimaryFooterButton label="Start the game" onClick={game.startRoundFromReview} />
      </FooterStack>
    );
  }

  if (game.match && game.activeMode === "ready") {
    return <ReadyFooter game={game} />;
  }

  if (game.activeMode === "turn" && game.match?.activeTurn) {
    return (
      <div className="grid w-full grid-cols-2 gap-3">
        <SecondaryFooterButton
          disabled={!canQueueSkipped(game.match.activeTurn)}
          icon={<IconSkipForward className="size-5" />}
          label="Skip"
          onClick={game.skip}
        />
        <PrimaryFooterButton
          icon={<IconCheck className="size-5" />}
          label="Correct"
          onClick={game.correct}
        />
      </div>
    );
  }

  if (game.match && game.activeMode === "finalSummary") {
    return (
      <FooterStack>
        <PrimaryFooterButton label="Final scores" onClick={game.viewResults} />
      </FooterStack>
    );
  }

  if (game.match && game.activeMode === "results") {
    return (
      <FooterStack>
        <PassAndPlayGameResultActions
          onPickAnotherGame={onPickAnotherGame}
          onPlayAgain={game.playAgainFromSettings}
        />
      </FooterStack>
    );
  }

  return undefined;
}

function LandingFooter({
  confirmDiscardPending,
  hasPendingMatch,
  onCancelDiscard,
  onConfirmDiscard,
  onRequestDiscard,
  onStartGame,
}: {
  readonly confirmDiscardPending: boolean;
  readonly hasPendingMatch: boolean;
  readonly onCancelDiscard: () => void;
  readonly onConfirmDiscard: () => void;
  readonly onRequestDiscard: () => void;
  readonly onStartGame: () => void;
}) {
  if (confirmDiscardPending) {
    return (
      <FooterStack>
        <SecondaryFooterButton label="Cancel" onClick={onCancelDiscard} />
        <PrimaryFooterButton label="Discard saved game" onClick={onConfirmDiscard} />
      </FooterStack>
    );
  }

  if (hasPendingMatch) {
    return (
      <FooterStack>
        <PrimaryFooterButton label="Start new game" onClick={onRequestDiscard} />
      </FooterStack>
    );
  }

  return (
    <FooterStack>
      <PrimaryFooterButton label="Start game" onClick={onStartGame} />
    </FooterStack>
  );
}

function ReadyFooter({ game }: { readonly game: WhoWhatWhereSingleplayerController }) {
  if (!game.match) {
    return null;
  }

  const readyDescriberName = getActiveContext(game.match).describer.name;

  return (
    <FooterStack>
      {game.readyHandoffRevealed ? (
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
      )}
    </FooterStack>
  );
}

export function WhoWhatWhereModeContent({
  game,
}: {
  readonly game: WhoWhatWhereSingleplayerController;
}) {
  if (game.loaded === false) {
    return (
      <p role="status" className="text-typ-body text-muted-foreground">
        Loading saved game…
      </p>
    );
  }
  if (game.storageError || game.paused) {
    return (
      <section className="flex min-h-full flex-col justify-center gap-4 py-6">
        <h2 className="text-typ-section-title font-semibold">
          {game.hydrationFailed
            ? "Saved game unavailable"
            : game.storageError
              ? "Progress needs saving"
              : "Game paused"}
        </h2>
        {game.storageError ? (
          <div role="alert" className="space-y-2 text-typ-body">
            <p>
              {game.hydrationFailed
                ? game.confirmDiscardPending
                  ? "Discard this saved game? This permanently removes its setup and progress from this phone."
                  : "Your saved game has been kept. Retry loading it, or deliberately discard it to start again."
                : "Your latest changes are still in memory. Retry saving before continuing."}
            </p>
            <p className="text-typ-ui text-destructive">{game.storageError}</p>
          </div>
        ) : (
          <p className="text-typ-body text-muted-foreground">
            {game.match?.stage === "turn"
              ? `Pass to ${getActiveContext(game.match).describer.name}. Resume when only they can see the screen.`
              : "Continue when everyone is ready. Your setup and game are kept on this phone."}
          </p>
        )}
        {game.match?.stage === "turn" ? (
          <p className="text-typ-body font-semibold tabular-nums">
            {game.secondsRemaining} seconds remaining
          </p>
        ) : null}
        {game.storageNotice ? (
          <p role="status" className="text-typ-ui text-muted-foreground">
            {game.storageNotice}
          </p>
        ) : null}
      </section>
    );
  }
  if (game.activeMode === "landing") {
    return (
      <WhoWhatWhereLandingScreen
        confirmDiscardPending={game.confirmDiscardPending}
        pendingMatch={game.pendingMatch}
        onResume={game.resumePendingMatch}
      />
    );
  }

  if (game.activeMode === "settings") {
    return <SettingsScreen settings={game.settings} onChange={game.updateSettings} />;
  }

  if (game.activeMode === "team") {
    return (
      <TeamSetupScreen
        error={game.setupError}
        settings={game.settings}
        teamIndex={game.teamStep}
        teams={game.teamSetups}
        onBack={game.goBackFromTeamSetup}
        onTeamsChange={game.setTeamSetups}
      />
    );
  }

  if (game.activeMode === "review") {
    return <WhoWhatWhereReviewTeamsScreen teams={game.teamSetups} />;
  }

  if (game.pendingMatch || !game.match) {
    return null;
  }

  if (game.activeMode === "ready") {
    return (
      <WhoWhatWhereDeviceReady
        key={`${game.match.roundNumber}-${game.match.teamIndex}`}
        error={game.turnError}
        handoffRevealed={game.readyHandoffRevealed}
        match={game.match}
      />
    );
  }

  if (game.activeMode === "turn" && game.match.activeTurn) {
    return (
      <ActiveTurnScreen
        match={game.match}
        secondsRemaining={game.secondsRemaining}
        onRevealHint={game.revealHint}
        onReturnSkipped={game.returnSkipped}
      />
    );
  }

  if (game.activeMode === "finalSummary") {
    return <FinalTurnRecapScreen match={game.match} />;
  }

  if (game.activeMode === "results") {
    return <ResultsScreen match={game.match} />;
  }

  return null;
}
