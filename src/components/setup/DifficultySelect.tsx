import { ChevronDown } from "lucide-react";
import { useId } from "react";

import type { WordPoolOptions } from "@/data/wordCatalogue";

type Difficulty = NonNullable<WordPoolOptions["difficulty"]>;

export function DifficultySelect({
  value,
  onChange,
  disabled = false,
}: {
  readonly value: Difficulty;
  readonly onChange: (value: Difficulty) => void;
  readonly disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <label htmlFor={id} className="w-[5.5rem] shrink-0 text-typ-ui font-semibold">
        Difficulty
      </label>
      <div className="relative min-w-0 flex-1">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as Difficulty)}
          className="h-11 w-full min-w-0 appearance-none rounded-xl border border-border bg-card py-2 pl-3 pr-10 text-typ-ui font-semibold text-foreground disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <option value="all">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2"
        />
      </div>
    </div>
  );
}
