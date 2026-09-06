import { type ReactNode, useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/button";

/** Mount only while open. Native modal behavior contains focus and makes the page inert. */
export function ModalDialog({
  title,
  children,
  onClose,
}: {
  readonly title: string;
  readonly children: ReactNode;
  readonly onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  useEffect(() => {
    // A new confirmation can remove the focused action while reusing this dialog.
    closeRef.current?.focus();
  }, [title]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl border border-border bg-card p-5 text-foreground shadow-xl backdrop:bg-black/50"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id={titleId} className="text-typ-card-title font-semibold">
          {title}
        </h2>
        <Button
          ref={closeRef}
          aria-label="Close dialog"
          type="button"
          variant="ghost"
          onClick={onClose}
        >
          ×
        </Button>
      </div>
      {children}
    </dialog>
  );
}
