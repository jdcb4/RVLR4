import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppInfoHeaderButton, AppInfoOverlay } from "@/components/AppInfoOverlay";
import { FooterActionLockContext } from "@/components/footerActionLockContext";
import { GameScreenHeaderActions } from "@/components/game/GameScreenHeaderActions";
import { GameShell } from "@/components/GameShell";
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
      trailing={<AppInfoHeaderButton onClick={() => setShowAppInfo(true)} />}
    />
  );

  const footer = (
    <WhoWhatWhereFooter game={game} onPickAnotherGame={() => navigate("/passnplay")} />
  );

  return (
    <FooterActionLockContext.Provider value={game.footerActionsLocked}>
      <GameShell footer={footer} headerRight={headerRight} title="Who What Where">
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
