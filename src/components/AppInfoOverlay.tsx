import { ModalDialog } from "@/components/ModalDialog";
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
    <ModalDialog title={title} onClose={onClose}>
      <p className="mt-2 text-typ-ui text-muted-foreground">By jdcb4. Version {version}.</p>
    </ModalDialog>
  );
}

/** Circular info control used in both game headers. */
export function AppInfoHeaderButton({ onClick }: { readonly onClick: () => void }) {
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
