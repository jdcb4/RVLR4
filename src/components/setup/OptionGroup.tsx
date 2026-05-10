import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function OptionGroup({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className="text-typ-ui font-semibold">{label}</legend>
      <div className="grid grid-flow-col auto-cols-fr gap-2">{children}</div>
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
      className="h-11"
      variant={selected ? "default" : "outline"}
      onClick={onClick}
      type="button"
    >
      {children}
    </Button>
  );
}
