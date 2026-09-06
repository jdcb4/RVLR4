import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OptionGroup({
  label,
  children,
  className,
  optionsClassName,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly optionsClassName?: string;
}) {
  return (
    <fieldset className={cn("grid min-w-0 gap-3", className)}>
      <legend className="text-typ-ui font-semibold">{label}</legend>
      <div className={cn("flex flex-wrap gap-2", optionsClassName)}>{children}</div>
    </fieldset>
  );
}

export function OptionButton({
  selected,
  children,
  onClick,
}: {
  readonly selected: boolean;
  readonly children: ReactNode;
  readonly onClick: () => void;
}) {
  return (
    <Button
      aria-pressed={selected}
      className="h-auto min-h-11 min-w-11 flex-1 whitespace-normal"
      variant={selected ? "default" : "outline"}
      onClick={onClick}
      type="button"
    >
      {children}
    </Button>
  );
}
