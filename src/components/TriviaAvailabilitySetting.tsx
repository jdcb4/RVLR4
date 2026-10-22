import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  getFeaturePreferenceState,
  initializeFeaturePreferences,
  selectTriviaEnabled,
  subscribeFeaturePreferences,
} from "@/services/featurePreference";

export function TriviaAvailabilitySetting() {
  const { triviaEnabled, loaded, busy, error } = useSyncExternalStore(
    subscribeFeaturePreferences,
    getFeaturePreferenceState,
  );
  return (
    <section className="mt-3 border-b border-border pb-3" aria-label="Show Trivia">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 id="trivia-enabled-label" className="text-typ-card-title font-semibold">
            Show Trivia
          </h3>
          <p id="trivia-enabled-description" className="text-typ-micro text-muted-foreground">
            Show Trivia on the game picker
          </p>
        </div>
        <Button
          type="button"
          role="switch"
          aria-checked={triviaEnabled}
          aria-labelledby="trivia-enabled-label"
          aria-describedby="trivia-enabled-description"
          disabled={!loaded || busy}
          variant={triviaEnabled ? "default" : "outline"}
          className="min-w-20 shrink-0"
          onClick={() => void selectTriviaEnabled(!triviaEnabled)}
        >
          {triviaEnabled ? "On" : "Off"}
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
          onClick={() => void initializeFeaturePreferences()}
        >
          Retry loading Show Trivia
        </Button>
      )}
    </section>
  );
}
