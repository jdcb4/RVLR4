import type { WordPoolOptions } from "@/data/wordCatalogue";

import { OptionButton, OptionGroup } from "./OptionGroup";

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
  const selected = value === "all" ? "hard" : value;
  return (
    <OptionGroup
      label="Difficulty"
      inlineLayout
      disabled={disabled}
      optionsClassName="grid grid-cols-3 gap-1 [&>button]:px-1"
    >
      {(
        [
          ["easy", "Easy"],
          ["medium", "Medium"],
          ["hard", "Hard"],
        ] as const
      ).map(([difficulty, label]) => (
        <OptionButton
          key={difficulty}
          selected={selected === difficulty}
          onClick={() => onChange(difficulty)}
        >
          {label}
        </OptionButton>
      ))}
    </OptionGroup>
  );
}
