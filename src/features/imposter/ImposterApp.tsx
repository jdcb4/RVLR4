import { useNavigate } from "react-router-dom";

import {
  AppInfoHeaderButton,
  AppInfoOverlay,
} from "@/components/AppInfoOverlay";
import { FooterActionLockContext } from "@/components/footerActionLockContext";
import { GameShell } from "@/components/GameShell";
import { buildImposterScreen } from "@/features/imposter/ImposterWebScreens";
import { useImposterApp } from "@/features/imposter/useImposterApp";

export function ImposterApp() {
  const navigate = useNavigate();
  const controller = useImposterApp();
  const screen = buildImposterScreen(controller, navigate);

  const showAppInfo = controller.loaded;
  const headerRight = showAppInfo ? (
    <AppInfoHeaderButton onClick={() => controller.setShowInfoPopup(true)} />
  ) : null;

  const footer = screen.actions ? (
    <div className="flex w-full flex-col gap-2">{screen.actions}</div>
  ) : undefined;

  return (
    <FooterActionLockContext.Provider value={controller.footerActionsLocked}>
      <GameShell footer={footer} headerRight={headerRight} title="Imposter">
        {controller.error ? (
          <p className="mb-3 font-medium text-typ-ui text-destructive">
            {controller.error}
          </p>
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
