import { Check } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

import {
  getThemeState,
  initializeTheme,
  selectTheme,
  subscribeTheme,
  themes,
} from "./themePreference";

export function ThemeChooser() {
  const { theme, busy, loaded, error } = useSyncExternalStore(subscribeTheme, getThemeState);
  return (
    <fieldset className="mt-3 min-w-0" disabled={busy} aria-busy={busy}>
      <legend className="mb-2 text-typ-card-title font-semibold">Theme</legend>
      <div className="grid gap-2">
        {themes.map((option) => (
          <label
            key={option.id}
            className="theme-option relative flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-border p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
            data-preview-theme={option.id}
          >
            <input
              disabled={!loaded}
              className="sr-only"
              type="radio"
              name="app-theme"
              value={option.id}
              checked={theme === option.id}
              onChange={() => void selectTheme(option.id)}
            />
            <span className="min-w-0 flex-1">
              <span className="theme-option-title block text-typ-ui font-bold">{option.name}</span>
              <span className="block text-typ-micro">{option.description}</span>
            </span>
            <span className="theme-option-swatches flex shrink-0 gap-1" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current"
              aria-hidden="true"
            >
              {theme === option.id && <Check className="size-4" />}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-typ-ui text-destructive">
          {error}
        </p>
      )}
      {!loaded && (
        <Button className="mt-2" disabled={busy} onClick={() => void initializeTheme()}>
          Retry loading theme
        </Button>
      )}
    </fieldset>
  );
}
