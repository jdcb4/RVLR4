import { Info } from "lucide-react";
import { useState } from "react";

import { ModalDialog } from "@/components/ModalDialog";
import { Button } from "@/components/ui/button";
import { APP_DISPLAY_NAME } from "@/config/appMeta";
import { PRIVACY_DATE, PRIVACY_SECTIONS, SUPPORT_EMAIL } from "@/config/privacy";

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
  const [notices, setNotices] = useState<string | null>(null);
  if (!open) {
    return null;
  }

  return (
    <ModalDialog title={title} onClose={onClose}>
      <p className="mt-2 text-typ-ui text-muted-foreground">By jdcb4. Version {version}.</p>
      <a className="mt-3 flex min-h-12 items-center underline" href={`mailto:${SUPPORT_EMAIL}`}>
        Contact support
      </a>
      <details className="mt-2 border-t border-border pt-2">
        <summary className="flex min-h-12 cursor-pointer items-center underline">
          Privacy policy
        </summary>
        <p className="text-sm text-muted-foreground">Effective {PRIVACY_DATE}</p>
        {PRIVACY_SECTIONS.map((section) => (
          <section key={section.title} className="mt-4">
            <h3 className="font-semibold">{section.title}</h3>
            <p className="mt-1 text-sm leading-relaxed">{section.text}</p>
          </section>
        ))}
      </details>
      <details
        className="mt-2 border-t border-border pt-2"
        onToggle={(event) => {
          if (event.currentTarget.open && notices === null) {
            void fetch("/third-party-notices.txt")
              .then((response) => {
                if (!response.ok) throw new Error("Unavailable");
                return response.text();
              })
              .then(setNotices)
              .catch(() =>
                setNotices(
                  "Licences could not be loaded. Please contact support if this continues.",
                ),
              );
          }
        }}
      >
        <summary className="flex min-h-12 cursor-pointer items-center underline">
          Open-source licences
        </summary>
        <pre className="whitespace-pre-wrap break-words text-xs">
          {notices ?? "Loading licences…"}
        </pre>
      </details>
    </ModalDialog>
  );
}

/** Circular info control used in both game headers. */
export function AppInfoHeaderButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <Button
      aria-label="App information"
      className="h-12 w-12 shrink-0 rounded-full p-0 text-typ-ui font-semibold"
      onClick={onClick}
      type="button"
      variant="secondary"
    >
      <Info className="size-5" aria-hidden="true" />
    </Button>
  );
}
