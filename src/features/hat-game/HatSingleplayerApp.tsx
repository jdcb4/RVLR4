import { useNavigate } from "react-router-dom";

import { AppInfoHeaderButton, AppInfoOverlay } from "@/components/AppInfoOverlay";
import { FooterActionLockContext } from "@/components/footerActionLockContext";
import { GameScreenHeaderActions } from "@/components/game/GameScreenHeaderActions";
import { GameShell } from "@/components/GameShell";
import { buildHatSingleplayerScreen } from "@/features/hat-game/HatSingleplayerWebScreens";
import { useHatSingleplayerApp } from "@/features/hat-game/useHatSingleplayerApp";

export function HatSingleplayerApp() {
  const navigate = useNavigate();
  const controller = useHatSingleplayerApp();
  const screen = buildHatSingleplayerScreen(controller, navigate);

  const showAppInfo = controller.loaded;
  const showEndTurn =
    controller.loaded &&
    controller.snapshot.step === "game" &&
    controller.snapshot.session?.stage === "turn";

  const headerRight = (
    <GameScreenHeaderActions
      {...(showEndTurn
        ? {
            endTurn: {
              onClick: () => controller.dispatchGameAction({ type: "end-turn" }),
            },
          }
        : {})}
      trailing={
        showAppInfo ? (
          <AppInfoHeaderButton onClick={() => controller.setShowInfoPopup(true)} />
        ) : null
      }
    />
  );

  const footer = screen.actions ? (
    <div className="flex w-full flex-col gap-2">{screen.actions}</div>
  ) : undefined;

  return (
    <FooterActionLockContext.Provider value={controller.footerActionsLocked}>
      <GameShell footer={footer} headerRight={headerRight} title="Hat Game">
        {controller.error && controller.snapshot.step !== "team" ? (
          <p className="mb-3 font-medium text-typ-ui text-destructive">{controller.error}</p>
        ) : null}
        {screen.content}

        <AppInfoOverlay
          open={controller.showInfoPopup}
          version={controller.appVersion}
          onClose={() => controller.setShowInfoPopup(false)}
        />
      </GameShell>
    </FooterActionLockContext.Provider>
  );
}
