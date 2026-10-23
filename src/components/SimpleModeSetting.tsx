import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  getContentPreferenceState,
  initializeContentPreferences,
  selectSimpleMode,
  subscribeContentPreferences,
} from "@/services/contentPreference";

export function SimpleModeSetting() {
  const { simpleMode, loaded, busy, error } = useSyncExternalStore(
    subscribeContentPreferences,
    getContentPreferenceState,
  );
  return (
    <section className="mt-3 border-b border-border pb-3" aria-label="Simple mode">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 id="simple-mode-label" className="text-typ-card-title font-semibold">
            Simple mode
          </h3>
          <p id="simple-mode-description" className="text-typ-micro text-muted-foreground">
            Easy words and questions · new games
          </p>
        </div>
        <Button
          type="button"
          role="switch"
          aria-checked={simpleMode}
          aria-labelledby="simple-mode-label"
          aria-describedby="simple-mode-description"
          disabled={!loaded || busy}
          variant={simpleMode ? "default" : "outline"}
          className="min-w-20 shrink-0"
          onClick={() => void selectSimpleMode(!simpleMode)}
        >
          {simpleMode ? "On" : "Off"}
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
          Retry loading Simple mode
        </Button>
      )}
    </section>
  );
}
