import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OptionGroup({
  label,
  children,
  className,
  optionsClassName,
  inlineLayout = false,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly optionsClassName?: string;
  readonly inlineLayout?: boolean;
}) {
  return (
    <fieldset className={cn("grid min-w-0 gap-3", inlineLayout && "block", className)}>
      <legend
        className={cn(
          "text-typ-ui font-semibold",
          inlineLayout && "float-left mr-2 flex min-h-11 w-[5.5rem] items-center",
        )}
      >
        {label}
      </legend>
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
