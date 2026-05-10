import { Button } from "@/components/ui/button";
import { APP_DISPLAY_NAME } from "@/config/appMeta";

/**
 * Shared “about this app” sheet (Hat Game + WhoWhatWhere). Auto-close is handled by the parent via `onClose` + `useEffect` timer if desired.
 */
export function AppInfoOverlay({
  open,
  onClose,
  version,
  title = APP_DISPLAY_NAME,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly version: string;
  /** Defaults to hub product name; individual games can still show their own screen title in the shell. */
  readonly title?: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-semantic-scrim p-4 sm:items-center"
      role="dialog"
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <p className="text-typ-card-title font-semibold">{title}</p>
          <Button
            aria-label="Close"
            className="h-8 px-2"
            onClick={onClose}
            type="button"
            variant="ghost"
          >
            ×
          </Button>
        </div>
        <p className="mt-2 text-typ-ui text-muted-foreground">
          By jdcb4. Version {version}.
        </p>
      </div>
    </div>
  );
}

/** Circular info control used in both game headers. */
export function AppInfoHeaderButton({
  onClick,
}: {
  readonly onClick: () => void;
}) {
  return (
    <Button
      aria-label="App information"
      className="h-9 w-9 shrink-0 rounded-full p-0 text-typ-ui font-semibold"
      onClick={onClick}
      type="button"
      variant="secondary"
    >
      i
    </Button>
  );
}
