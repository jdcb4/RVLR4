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
    <fieldset className={cn("grid gap-3", className)}>
      <legend className="text-typ-ui font-semibold">{label}</legend>
      <div className={cn("grid grid-flow-col auto-cols-fr gap-2", optionsClassName)}>
        {children}
      </div>
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
      className="h-11"
      variant={selected ? "default" : "outline"}
      onClick={onClick}
      type="button"
    >
      {children}
    </Button>
  );
}
