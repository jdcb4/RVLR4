import { type ReactNode,useContext } from "react";

import { FooterActionLockContext } from "@/components/footerActionLockContext";
import { Button } from "@/components/ui/button";

/** Primary full-width footer CTA (sticky shell footer). */
export function PrimaryFooterButton({
  label,
  onClick,
  disabled = false,
  icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const footerLocked = useContext(FooterActionLockContext);
  return (
    <Button
      className="flex h-12 w-full min-w-0 items-center justify-center gap-2"
      disabled={disabled || footerLocked}
      onClick={onClick}
      type="button"
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span>{label}</span>
    </Button>
  );
}

/** Outline full-width footer control (e.g. Skip). */
export function SecondaryFooterButton({
  label,
  onClick,
  disabled = false,
  icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const footerLocked = useContext(FooterActionLockContext);
  return (
    <Button
      className="flex h-12 w-full min-w-0 items-center justify-center gap-2"
      disabled={disabled || footerLocked}
      onClick={onClick}
      type="button"
      variant="outline"
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span>{label}</span>
    </Button>
  );
}

/** Full-width outline row for “return skipped item” lists during play. */
export function FooterOutlineIconTextButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  const footerLocked = useContext(FooterActionLockContext);
  return (
    <Button
      className="flex h-auto min-h-12 w-full justify-start gap-2 py-3 text-left"
      disabled={footerLocked}
      onClick={onClick}
      type="button"
      variant="outline"
    >
      <span className="shrink-0">{icon}</span>
      <span className="break-words">{label}</span>
    </Button>
  );
}

/** Compact footer icon button (e.g. lightning suggestion on clue entry). */
export function FooterIconSlotButton({
  label,
  icon,
  onClick,
  variant = "secondary",
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: "secondary" | "outline";
}) {
  const footerLocked = useContext(FooterActionLockContext);
  return (
    <Button
      aria-label={label}
      className="h-12 shrink-0 px-3"
      disabled={footerLocked}
      onClick={onClick}
      type="button"
      variant={variant}
    >
      {icon}
    </Button>
  );
}
