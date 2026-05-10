import { useState } from "react";

import { IconPencil } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EditableName({
  label,
  value,
  hideLabel = false,
  className = "",
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly hideLabel?: boolean;
  readonly className?: string;
  readonly onChange: (value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <label
        className={cn("grid min-w-0 gap-2 font-medium text-typ-ui", className)}
      >
        {!hideLabel && label}
        <span className="p-0.5">
          <input
            aria-label={label}
            autoFocus
            className="keyboard-safe-input h-12 w-full rounded-md border bg-background px-3 text-typ-input outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            maxLength={24}
            value={value}
            onBlur={() => setIsEditing(false)}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
          />
        </span>
      </label>
    );
  }

  return (
    <div className={`grid min-w-0 gap-2 ${className}`}>
      {!hideLabel && <p className="font-medium text-typ-ui">{label}</p>}
      <div className="flex h-12 items-center justify-between gap-3 rounded-md border bg-card px-3">
        <p className="min-w-0 truncate text-typ-body font-semibold">{value}</p>
        <Button
          aria-label={`Edit ${label}`}
          size="icon"
          variant="ghost"
          onClick={() => setIsEditing(true)}
        >
          <IconPencil className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
