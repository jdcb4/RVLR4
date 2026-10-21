import { Settings } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { AppInfoHeaderButton, AppInfoOverlay } from "@/components/AppInfoOverlay";
import { IconDisguise, IconTopHat, IconWhoWhatWhere } from "@/components/icons";
import { ModalDialog } from "@/components/ModalDialog";
import { Button } from "@/components/ui/button";

import packageJson from "../../../package.json";

/** The first Android device-test build intentionally exposes one converted game. */
export function PassNPlayHubPage() {
  const [openDialog, setOpenDialog] = useState<"settings" | "info" | null>(null);

  return (
    <main className="safe-screen mx-auto flex min-h-dvh w-full max-w-md flex-col gap-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-typ-display font-bold tracking-tight text-primary">RVLRY</h1>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            aria-label="Settings"
            aria-haspopup="dialog"
            className="rounded-full"
            size="icon"
            variant="secondary"
            onClick={() => setOpenDialog("settings")}
          >
            <Settings className="size-5" aria-hidden="true" />
          </Button>
          <AppInfoHeaderButton onClick={() => setOpenDialog("info")} />
        </div>
      </header>
      <section aria-labelledby="pick-game">
        <h2 id="pick-game" className="mb-3 text-typ-panel-title font-semibold">
          Pick a game
        </h2>
        <Link
          className="flex items-center gap-4 rounded-2xl bg-primary p-5 text-primary-foreground transition-colors hover:bg-semantic-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          to="/games/whowhatwhere"
        >
          <IconWhoWhatWhere className="size-12 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-typ-section-title font-bold">Who What Where</h3>
            <p className="mt-2 text-typ-body">Describe the word. Beat the timer. Pass the phone.</p>
          </div>
        </Link>
      </section>
      <section aria-labelledby="next-games">
        <h2 id="next-games" className="text-typ-card-title font-semibold">
          Coming next
        </h2>
        <p className="mt-1 text-typ-ui text-muted-foreground">
          Hat Game and Imposter follow after this phone test.
        </p>
        <ul className="mt-2 divide-y divide-border">
          <li className="flex items-center gap-3 py-4">
            <IconTopHat className="size-8 shrink-0" />
            <span>Hat Game</span>
          </li>
          <li className="flex items-center gap-3 py-4">
            <IconDisguise className="size-8 shrink-0" />
            <span>Imposter</span>
          </li>
        </ul>
      </section>
      {openDialog === "settings" && (
        <ModalDialog title="Settings" onClose={() => setOpenDialog(null)}>
          <div className="space-y-3 pt-3 text-typ-ui text-muted-foreground">
            <p>Words are included on your phone. No internet connection is needed to play.</p>
            <Button type="button" disabled variant="outline" className="w-full justify-start">
              Check for new words — not configured yet
            </Button>
            <p>A word-update source will be added before the friends-testing release.</p>
          </div>
        </ModalDialog>
      )}
      <AppInfoOverlay
        open={openDialog === "info"}
        version={packageJson.version}
        onClose={() => setOpenDialog(null)}
      />
    </main>
  );
}
