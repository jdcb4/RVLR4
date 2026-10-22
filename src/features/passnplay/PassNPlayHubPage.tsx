import { Settings } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { AppInfoHeaderButton, AppInfoOverlay } from "@/components/AppInfoOverlay";
import { IconDisguise, IconTopHat, IconWhoWhatWhere } from "@/components/icons";
import { KidsModeSetting } from "@/components/KidsModeSetting";
import { ModalDialog } from "@/components/ModalDialog";
import { Button } from "@/components/ui/button";
import { ThemeChooser } from "@/themes/ThemeChooser";

import packageJson from "../../../package.json";

/** Each game owns an independent durable session. */
export function PassNPlayHubPage() {
  const [openDialog, setOpenDialog] = useState<"settings" | "info" | null>(null);

  return (
    <main className="game-picker safe-screen mx-auto flex min-h-dvh w-full max-w-md flex-col gap-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
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
        <div className="grid gap-3">
          {[
            {
              title: "Who What Where",
              description: "Describe the word. Beat the timer.",
              path: "whowhatwhere",
              Icon: IconWhoWhatWhere,
            },
            {
              title: "Hat Game",
              description: "Your famous figures. Three ways to play.",
              path: "hat",
              Icon: IconTopHat,
            },
            {
              title: "Imposter",
              description: "Give a clue. Spot the bluff.",
              path: "imposter",
              Icon: IconDisguise,
            },
          ].map(({ title, description, path, Icon }) => (
            <Link
              key={path}
              className="game-ticket flex min-h-28 items-center gap-4 rounded-2xl border border-border bg-card p-5 text-foreground transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              to={`/games/${path}`}
            >
              <Icon className="size-12 shrink-0 text-primary" />
              <div className="min-w-0">
                <h3 className="text-typ-section-title font-bold">{title}</h3>
                <p className="mt-1 text-typ-ui text-muted-foreground">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      {openDialog === "settings" && (
        <ModalDialog title="Settings" onClose={() => setOpenDialog(null)}>
          <KidsModeSetting />
          <ThemeChooser />
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
