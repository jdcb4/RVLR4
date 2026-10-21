import { type ReactNode, useContext } from "react";

import { FooterActionLockContext } from "@/components/footerActionLockContext";
import { PrimaryFooterButton, SecondaryFooterButton } from "@/components/game/GameFooterButtons";
import { IconCheck, IconSkipForward } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { canQueueSkipped, getActiveContext } from "@/domain/whowhatwhere/game";
import {
  WhoWhatWhereDeviceRecap,
  WhoWhatWhereDeviceResults,
  WhoWhatWhereDeviceRoundComplete,
} from "@/features/whowhatwhere/results/WhoWhatWhereDeviceResults";
import { SettingsScreen } from "@/features/whowhatwhere/setup/SettingsScreen";
import {
  WhoWhatWhereDeviceReview,
  WhoWhatWhereDeviceTeamSetup,
  WhoWhatWhereSetupSteps,
} from "@/features/whowhatwhere/setup/WhoWhatWhereDeviceSetup";
import { ActiveTurnScreen } from "@/features/whowhatwhere/turn/ActiveTurnScreen";
import { WhoWhatWhereDeviceReady } from "@/features/whowhatwhere/turn/WhoWhatWhereDeviceReady";
import type { WhoWhatWhereSingleplayerController } from "@/features/whowhatwhere/useWhoWhatWhereSingleplayerApp";
import { WhoWhatWhereDeviceProgress } from "@/features/whowhatwhere/WhoWhatWhereDeviceProgress";
import { formatSavedAt } from "@/lib/formatSavedAt";

function FooterStack({ children }: { readonly children: ReactNode }) {
  return <div className="flex w-full flex-col gap-2">{children}</div>;
}

function presentationContext(game: WhoWhatWhereSingleplayerController) {
  const match = game.match;
  if (!match) return null;
  if ((game.presentationStage || match.stage === "finalSummary") && match.lastTurnSummary) {
    return {
      name: match.lastTurnSummary.describerName,
      teamName: match.lastTurnSummary.teamName,
      round: Math.max(1, Math.ceil(match.turnSummaries.length / match.teamOrder.length)),
    };
  }
  const { describer, team } = getActiveContext(match);
  return {
    name: describer.name,
    teamName: team.name,
    round: Math.min(match.roundNumber, match.settings.totalRounds),
  };
}

function QuietFooterButton({
  label,
  onClick,
}: {
  readonly label: string;
  readonly onClick: () => void;
}) {
  const locked = useContext(FooterActionLockContext);
  return (
    <Button className="min-h-11 w-full" disabled={locked} variant="ghost" onClick={onClick}>
      {label}
    </Button>
  );
}

export function WhoWhatWhereFooter({
  game,
  onPickAnotherGame,
}: {
  readonly game: WhoWhatWhereSingleplayerController;
  readonly onPickAnotherGame: () => void;
}) {
  const locked = useContext(FooterActionLockContext);
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
  if (game.confirmDiscardPending) {
    return (
      <FooterStack>
        <PrimaryFooterButton
          label="Replace game and review setup"
          onClick={() => void game.startOverFromPendingMatch()}
        />
        <SecondaryFooterButton
          label="Keep saved game"
          onClick={() => game.setConfirmDiscardPending(false)}
        />
      </FooterStack>
    );
  }
  if (game.savedGameAvailable || game.pendingMatch) {
    return (
      <FooterStack>
        <PrimaryFooterButton label="Resume game" onClick={() => void game.resumePendingMatch()} />
        <SecondaryFooterButton
          label="Start new game"
          onClick={() => game.setConfirmDiscardPending(true)}
        />
      </FooterStack>
    );
  }
  if (game.paused) {
    const presenter = game.match ? getActiveContext(game.match).describer.name : "";
    return (
      <FooterStack>
        <PrimaryFooterButton
          label={game.match?.stage === "turn" ? `Resume ${presenter}’s turn` : "Continue"}
          onClick={() => void game.resumeGame()}
        />
        <SecondaryFooterButton label="Save and leave" onClick={onPickAnotherGame} />
        {game.match?.stage === "turn" ? (
          <QuietFooterButton label="End turn" onClick={game.endPausedTurn} />
        ) : null}
        <QuietFooterButton
          label="Start new game"
          onClick={() => game.setConfirmDiscardPending(true)}
        />
      </FooterStack>
    );
  }
  if (game.match && game.presentationStage === "recap") {
    const label =
      game.match.stage === "finalSummary"
        ? "Final scores"
        : game.match.teamIndex === 0
          ? "View round scores"
          : `Pass phone to ${getActiveContext(game.match).describer.name}`;
    return (
      <FooterStack>
        <PrimaryFooterButton label={label} onClick={game.advanceTurnRecap} />
        <QuietFooterButton label="Save and leave" onClick={onPickAnotherGame} />
      </FooterStack>
    );
  }
  if (game.match && game.presentationStage === "roundComplete") {
    return (
      <FooterStack>
        <PrimaryFooterButton
          label={`Pass phone to ${getActiveContext(game.match).describer.name}`}
          onClick={game.continueAfterRound}
        />
        <QuietFooterButton label="Save and leave" onClick={onPickAnotherGame} />
      </FooterStack>
    );
  }
  if (game.activeMode === "landing")
    return <PrimaryFooterButton label="Start game" onClick={game.goToSettingsFromLanding} />;
  if (game.activeMode === "settings")
    return <PrimaryFooterButton label="Next: Team 1" onClick={game.goToTeamSetup} />;
  if (game.activeMode === "team")
    return <PrimaryFooterButton label="Save team" onClick={game.advanceTeamSetup} />;
  if (game.activeMode === "review")
    return (
      <FooterStack>
        <PrimaryFooterButton label="Start game" onClick={game.startRoundFromReview} />
        <SecondaryFooterButton label="Edit teams" onClick={game.leaveReviewToTeamSetup} />
      </FooterStack>
    );
  if (game.match && game.activeMode === "ready")
    return (
      <FooterStack>
        <PrimaryFooterButton
          disabled={game.isStartingTurn}
          label={
            game.isStartingTurn
              ? "Loading words"
              : `I’m ${getActiveContext(game.match).describer.name}, start turn`
          }
          onClick={() => void game.startNextTurn()}
        />
        <QuietFooterButton label="Save and leave" onClick={onPickAnotherGame} />
      </FooterStack>
    );
  if (game.activeMode === "turn" && game.match?.activeTurn) {
    return (
      <div className="flex w-full flex-col gap-2 pb-1">
        <div className="grid w-full grid-cols-[1fr_2fr] gap-3">
          <Button
            className="min-h-[4.75rem] border border-semantic-skipped-border bg-semantic-skipped-bg text-semantic-skipped-foreground"
            disabled={locked || !canQueueSkipped(game.match.activeTurn)}
            variant="outline"
            onClick={game.skip}
          >
            <IconSkipForward className="size-5" />
            Skip
          </Button>
          <Button className="min-h-[4.75rem]" disabled={locked} onClick={game.correct}>
            <IconCheck className="size-5" />
            Correct
          </Button>
        </div>
        <QuietFooterButton label="Pause turn" onClick={game.pauseGame} />
      </div>
    );
  }
  if (game.match && game.activeMode === "finalSummary")
    return <PrimaryFooterButton label="Final scores" onClick={game.viewResults} />;
  if (game.match && game.activeMode === "results")
    return (
      <FooterStack>
        <PrimaryFooterButton
          label="Play again with these teams"
          onClick={game.playAgainFromSettings}
        />
        <SecondaryFooterButton label="Back to games" onClick={onPickAnotherGame} />
      </FooterStack>
    );
  return null;
}

export function WhoWhatWhereModeContent({
  game,
}: {
  readonly game: WhoWhatWhereSingleplayerController;
}) {
  if (game.loaded === false)
    return (
      <p role="status" className="text-typ-body text-muted-foreground">
        Loading saved game…
      </p>
    );
  if (game.storageError)
    return (
      <section className="flex min-h-full flex-col justify-center gap-4 py-4">
        <h2 className="text-typ-section-title font-semibold">
          {game.hydrationFailed ? "Saved game unavailable" : "Progress needs saving"}
        </h2>
        <div role="alert" className="space-y-2 text-typ-body">
          <p>
            {game.hydrationFailed
              ? game.confirmDiscardPending
                ? "Discard this saved game? Its setup and progress will be removed."
                : "Your saved game has been kept. Retry loading, or discard it to start again."
              : "Your latest changes are still in memory. Retry saving before continuing."}
          </p>
          <p className="text-typ-ui text-destructive">{game.storageError}</p>
        </div>
      </section>
    );
  if (game.confirmDiscardPending)
    return (
      <section className="flex flex-1 flex-col justify-center gap-3">
        <h2 className="text-typ-section-title font-semibold">Replace the saved game?</h2>
        <p className="text-typ-body text-muted-foreground">
          The current game will be removed. Keep the teams and settings for your new game.
        </p>
      </section>
    );
  if (game.savedGameAvailable || game.pendingMatch) {
    const context = presentationContext(game);
    return (
      <section className="flex flex-1 flex-col justify-center gap-4">
        <h2 className="text-typ-section-title font-semibold">Ready when you are.</h2>
        <div className="space-y-2 rounded-xl bg-card p-4">
          <h3 className="text-typ-body font-semibold">Saved game</h3>
          <p className="text-typ-ui text-muted-foreground">
            {formatSavedAt(game.savedAt ?? game.pendingMatch?.savedAt)}
          </p>
          {game.match && context ? (
            <>
              <p className="break-words text-typ-body font-semibold">
                {context.name} · {context.teamName}
              </p>
              <p className="text-typ-ui text-muted-foreground">
                Round {context.round} of {game.match.settings.totalRounds}
                {game.match.activeTurn
                  ? ` · ${game.secondsRemaining} seconds remaining`
                  : game.presentationStage === "roundComplete"
                    ? " · Round complete"
                    : game.presentationStage === "recap" || game.match.stage === "finalSummary"
                      ? " · Turn recap"
                      : " · Ready to play"}
              </p>
            </>
          ) : (
            <p className="text-typ-body">{game.settings.teamCount} teams · Setup</p>
          )}
        </div>
        {game.storageNotice ? (
          <p role="status" className="text-typ-ui text-muted-foreground">
            {game.storageNotice}
          </p>
        ) : null}
      </section>
    );
  }
  if (game.paused) {
    const context = presentationContext(game);
    return (
      <section className="flex min-h-full flex-col">
        {game.match ? (
          <WhoWhatWhereDeviceProgress
            match={game.match}
            phase={
              game.presentationStage === "recap" || game.match.stage === "finalSummary"
                ? "recap"
                : game.presentationStage === "roundComplete"
                  ? "roundComplete"
                  : "active"
            }
          />
        ) : null}
        <div className="flex flex-1 flex-col justify-center gap-3 pb-5">
          <h2 className="text-typ-section-title font-semibold">Take your time.</h2>
          {context ? (
            <div className="space-y-2">
              <p className="break-words text-typ-body font-semibold">
                {context.name} · {context.teamName}
              </p>
              {game.match?.activeTurn ? (
                <p className="text-typ-body text-muted-foreground">
                  {game.secondsRemaining} seconds remaining
                  <br />
                  {game.match.activeTurn.correctCount} correct this turn
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-typ-body text-muted-foreground">Setup paused.</p>
          )}
          {game.storageNotice ? (
            <p role="status" className="text-typ-ui text-muted-foreground">
              {game.storageNotice}
            </p>
          ) : null}
        </div>
      </section>
    );
  }
  if (game.match && game.presentationStage === "recap")
    return <WhoWhatWhereDeviceRecap match={game.match} />;
  if (game.match && game.presentationStage === "roundComplete")
    return <WhoWhatWhereDeviceRoundComplete match={game.match} />;
  if (game.activeMode === "landing")
    return (
      <section className="flex flex-1 flex-col justify-center">
        <h2 className="text-typ-section-title font-semibold">Ready to play?</h2>
      </section>
    );
  if (game.activeMode === "settings")
    return (
      <>
        <WhoWhatWhereSetupSteps current="settings" />
        <h2 className="mb-3 text-typ-section-title font-semibold">Game settings</h2>
        <SettingsScreen embedded settings={game.settings} onChange={game.updateSettings} />
      </>
    );
  if (game.activeMode === "team")
    return (
      <>
        <WhoWhatWhereSetupSteps current="team" />
        <WhoWhatWhereDeviceTeamSetup
          error={game.setupError}
          teamIndex={game.teamStep}
          teams={game.teamSetups}
          onBack={game.goBackFromTeamSetup}
          onTeamsChange={game.setTeamSetups}
        />
      </>
    );
  if (game.activeMode === "review")
    return (
      <>
        <WhoWhatWhereSetupSteps current="review" />
        <WhoWhatWhereDeviceReview teams={game.teamSetups} />
      </>
    );
  if (!game.match) return null;
  if (game.activeMode === "ready")
    return (
      <WhoWhatWhereDeviceReady
        key={`${game.match.roundNumber}-${game.match.teamIndex}`}
        error={game.turnError}
        match={game.match}
      />
    );
  if (game.activeMode === "turn" && game.match.activeTurn)
    return (
      <ActiveTurnScreen
        match={game.match}
        secondsRemaining={game.secondsRemaining}
        onRevealHint={game.revealHint}
        onReturnSkipped={game.returnSkipped}
      />
    );
  if (game.activeMode === "finalSummary") return <WhoWhatWhereDeviceRecap match={game.match} />;
  if (game.activeMode === "results") return <WhoWhatWhereDeviceResults match={game.match} />;
  return null;
}
