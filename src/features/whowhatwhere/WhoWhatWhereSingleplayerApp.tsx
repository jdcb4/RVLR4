import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppInfoHeaderButton, AppInfoOverlay } from "@/components/AppInfoOverlay";
import { FooterActionLockContext } from "@/components/footerActionLockContext";
import { GameShell } from "@/components/GameShell";
import { Button } from "@/components/ui/button";
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
  const leaveToPicker = useCallback(() => {
    void leaveGame().then((saved) => {
      if (saved) navigate("/passnplay");
    });
  }, [leaveGame, navigate]);

  useEffect(() => {
    const handleBack = (event: Event) => {
      event.preventDefault();
      if (game.paused || game.activeMode === "landing" || game.activeMode === "results") {
        leaveToPicker();
      } else if (game.match) {
        pauseGame();
      } else {
        goBack();
      }
    };
    window.addEventListener("rvlry:back", handleBack);
    return () => window.removeEventListener("rvlry:back", handleBack);
  }, [game.activeMode, game.match, game.paused, goBack, leaveToPicker, pauseGame]);

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
    !game.paused &&
    !game.storageError &&
    Boolean(game.match.activeTurn);

  const headerRight = (
    <>
      {showEndTurn ? (
        <>
          <Button
            aria-label="Pause turn"
            className="size-12 p-0"
            variant="outline"
            onClick={game.pauseGame}
          >
            <svg
              aria-hidden="true"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14M16 5v14" />
            </svg>
          </Button>
          <Button
            aria-label="End turn"
            className="h-12 px-3"
            disabled={game.saving}
            onClick={game.endTurn}
          >
            End
          </Button>
        </>
      ) : (
        <AppInfoHeaderButton onClick={() => setShowAppInfo(true)} />
      )}
    </>
  );

  const footer = <WhoWhatWhereFooter game={game} onPickAnotherGame={leaveToPicker} />;

  return (
    <FooterActionLockContext.Provider value={game.footerActionsLocked}>
      <GameShell
        footer={footer}
        headerRight={headerRight}
        onHome={leaveToPicker}
        title="Who What Where"
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
