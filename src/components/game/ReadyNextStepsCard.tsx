import type { ReactNode } from "react";

/**
 * Bottom “Next steps” card for between-turn handoff — instructional copy plus give-phone line.
 */
export function ReadyNextStepsCard({
  primaryText,
  givePhoneLine,
}: {
  /** Main coaching copy (may include multiple sentences or inline emphasis). */
  readonly primaryText: ReactNode;
  /** Usually “Give the phone to …” — omitted on **Final turn recap** screens. */
  readonly givePhoneLine?: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="font-semibold text-foreground">Next steps</p>
      <div className="text-typ-body text-muted-foreground">{primaryText}</div>
      {givePhoneLine != null ? (
        <div className="text-typ-body text-muted-foreground">{givePhoneLine}</div>
      ) : null}
    </div>
  );
}
