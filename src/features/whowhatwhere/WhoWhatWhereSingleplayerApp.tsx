import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppInfoHeaderButton, AppInfoOverlay } from "@/components/AppInfoOverlay";
import { FooterActionLockContext } from "@/components/footerActionLockContext";
import { GameShell } from "@/components/GameShell";
import { IconWhoWhatWhere } from "@/components/icons";
import { useWhoWhatWhereSingleplayerApp } from "@/features/whowhatwhere/useWhoWhatWhereSingleplayerApp";
import {
  WhoWhatWhereFooter,
  WhoWhatWhereModeContent,
} from "@/features/whowhatwhere/WhoWhatWhereSingleplayerChrome";

import packageJson from "../../../package.json";

export function WhoWhatWhereSingleplayerApp() {
  const navigate = useNavigate();
  const game = useWhoWhatWhereSingleplayerApp();
  const [showAppInfo, setShowAppInfo] = useState(false);
  const leaveGame = game.leaveGame;
  const pauseGame = game.pauseGame;
  const goBack = game.goBack;
  const setConfirmDiscardPending = game.setConfirmDiscardPending;
  const leaveToPicker = useCallback(() => {
    void leaveGame().then((saved) => {
      if (saved) navigate("/passnplay");
    });
  }, [leaveGame, navigate]);

  useEffect(() => {
    const handleBack = (event: Event) => {
      event.preventDefault();
      if (game.confirmDiscardPending) {
        setConfirmDiscardPending(false);
      } else if (
        game.savedGameAvailable ||
        game.paused ||
        game.activeMode === "landing" ||
        game.activeMode === "results"
      ) {
        leaveToPicker();
      } else if (game.match) {
        pauseGame();
      } else {
        goBack();
      }
    };
    window.addEventListener("rvlry:back", handleBack);
    return () => window.removeEventListener("rvlry:back", handleBack);
  }, [
    game.activeMode,
    game.confirmDiscardPending,
    game.match,
    game.paused,
    game.savedGameAvailable,
    setConfirmDiscardPending,
    goBack,
    leaveToPicker,
    pauseGame,
  ]);

  useEffect(() => {
    if (!showAppInfo) {
      return undefined;
    }
    const timeout = setTimeout(() => setShowAppInfo(false), 5000);
    return () => clearTimeout(timeout);
  }, [showAppInfo]);

  const playing =
    !game.savedGameAvailable &&
    game.match &&
    game.activeMode === "turn" &&
    !game.paused &&
    !game.storageError &&
    Boolean(game.match.activeTurn);
  const showRound =
    game.match &&
    !game.savedGameAvailable &&
    !game.confirmDiscardPending &&
    game.activeMode !== "results";
  const displayedRound = game.match
    ? game.presentationStage
      ? Math.max(1, Math.ceil(game.match.turnSummaries.length / game.match.teamOrder.length))
      : Math.min(game.match.roundNumber, game.match.settings.totalRounds)
    : 1;
  const headerRight = showRound ? (
    <span className="text-right text-typ-micro text-muted-foreground">
      Round {displayedRound}
      <br />
      of {game.match!.settings.totalRounds}
    </span>
  ) : (
    <AppInfoHeaderButton onClick={() => setShowAppInfo(true)} />
  );

  const footer = <WhoWhatWhereFooter game={game} onPickAnotherGame={leaveToPicker} />;

  return (
    <FooterActionLockContext.Provider value={game.footerActionsLocked}>
      <GameShell
        compact
        footer={footer}
        headerRight={headerRight}
        onHome={leaveToPicker}
        title={
          <span className="flex items-center justify-center gap-2">
            <IconWhoWhatWhere className="size-7 shrink-0 text-primary" />
            <span className={playing ? "text-typ-ui" : "text-typ-body"}>Who What Where</span>
          </span>
        }
      >
        <AppInfoOverlay
          open={showAppInfo}
          version={packageJson.version}
          onClose={() => setShowAppInfo(false)}
        />

        <WhoWhatWhereModeContent game={game} />
      </GameShell>
    </FooterActionLockContext.Provider>
  );
}
