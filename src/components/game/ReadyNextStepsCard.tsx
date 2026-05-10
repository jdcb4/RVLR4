import type { ReactNode } from "react";

/**
 * Bottom “Next steps” card for between-turn handoff — instructional copy plus give-phone line.
 */
export function ReadyNextStepsCard({
  primaryText,
  givePhoneLine,
}: {
  /** Main coaching copy (may include multiple sentences). */
  readonly primaryText: string;
  /** Usually “Give the phone to …” — omitted on **Final turn recap** screens. */
  readonly givePhoneLine?: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="font-semibold text-foreground">Next steps</p>
      <p className="text-typ-body text-muted-foreground">{primaryText}</p>
      {givePhoneLine != null ? (
        <div className="text-typ-body text-muted-foreground">{givePhoneLine}</div>
      ) : null}
    </div>
  );
}
