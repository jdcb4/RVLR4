import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Metric({
  label,
  value,
  className,
}: {
  readonly label: string;
  readonly value: ReactNode;
  /** Optional layout helpers (e.g. `col-span-2` in a CSS grid). */
  readonly className?: string;
}) {
  return (
    <div className={cn("rounded-md border bg-card p-4", className)}>
      <p className="text-typ-ui text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-typ-metric font-semibold">{value}</p>
    </div>
  );
}
