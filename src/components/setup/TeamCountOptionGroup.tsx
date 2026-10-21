import { type SharedTeamCount, TEAM_COUNT_OPTIONS } from "@/config/teamRoster";

import { OptionButton, OptionGroup } from "./OptionGroup";

/**
 * Pick 2, 3, or 4 teams — shared by WhoWhatWhere settings and Hat Game setup.
 */
export function TeamCountOptionGroup({
  value,
  onChange,
  inlineLayout = false,
}: {
  readonly value: SharedTeamCount;
  readonly onChange: (count: SharedTeamCount) => void;
  readonly inlineLayout?: boolean;
}) {
  return (
    <OptionGroup
      inlineLayout={inlineLayout}
      label="Teams"
      optionsClassName={inlineLayout ? "grid grid-cols-3 gap-1 [&>button]:px-2" : ""}
    >
      {TEAM_COUNT_OPTIONS.map((teamCount) => (
        <OptionButton
          key={teamCount}
          selected={value === teamCount}
          onClick={() => onChange(teamCount)}
        >
          {teamCount}
        </OptionButton>
      ))}
    </OptionGroup>
  );
}
