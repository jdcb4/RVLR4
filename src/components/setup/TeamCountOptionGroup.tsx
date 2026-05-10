import { type SharedTeamCount,TEAM_COUNT_OPTIONS } from "@/config/teamRoster";

import { OptionButton, OptionGroup } from "./OptionGroup";

/**
 * Pick 2, 3, or 4 teams — shared by WhoWhatWhere settings and Hat Game setup.
 */
export function TeamCountOptionGroup({
  value,
  onChange,
}: {
  readonly value: SharedTeamCount;
  readonly onChange: (count: SharedTeamCount) => void;
}) {
  return (
    <OptionGroup label="Teams">
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
