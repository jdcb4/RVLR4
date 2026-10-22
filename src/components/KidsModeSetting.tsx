import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  getContentPreferenceState,
  initializeContentPreferences,
  selectKidsMode,
  subscribeContentPreferences,
} from "@/services/contentPreference";

export function KidsModeSetting() {
  const { kidsMode, loaded, busy, error } = useSyncExternalStore(
    subscribeContentPreferences,
    getContentPreferenceState,
  );
  return (
    <section className="mt-3 border-b border-border pb-3" aria-label="Kids mode">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 id="kids-mode-label" className="text-typ-card-title font-semibold">
            Kids mode
          </h3>
          <p id="kids-mode-description" className="text-typ-micro text-muted-foreground">
            Ages 8–12 · new games and suggestions
          </p>
        </div>
        <Button
          type="button"
          role="switch"
          aria-checked={kidsMode}
          aria-labelledby="kids-mode-label"
          aria-describedby="kids-mode-description"
          disabled={!loaded || busy}
          variant={kidsMode ? "default" : "outline"}
          className="min-w-20 shrink-0"
          onClick={() => void selectKidsMode(!kidsMode)}
        >
          {kidsMode ? "On" : "Off"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-typ-ui text-destructive">
          {error}
        </p>
      )}
      {!loaded && (
        <Button
          className="mt-2"
          disabled={busy}
          onClick={() => void initializeContentPreferences()}
        >
          Retry loading Kids mode
        </Button>
      )}
    </section>
  );
}
