import { z } from "zod";

import { MAX_PLAYERS_PER_TEAM } from "@/config/teamRoster";
import { addDuplicateIssues, staticTextSchema } from "@/data/staticDataSchemas";
import rawTeamNameSets from "@/data/whoWhatWhereNamePacks.json";

const teamNameSetSchema = z
  .object({
    name: staticTextSchema.max(24),
    members: z
      .array(staticTextSchema.max(24))
      .min(MAX_PLAYERS_PER_TEAM)
      .superRefine((members, context) => {
        addDuplicateIssues(members, (member) => member, context, "member name");
      }),
  })
  .strict();

export const teamNameSetsSchema = z
  .array(teamNameSetSchema)
  .min(4)
  .superRefine((sets, context) => {
    addDuplicateIssues(sets, (set) => set.name, context, "team name");
  });

export type TeamNameSet = {
  readonly name: string;
  readonly members: readonly string[];
};

const teamNameSets = teamNameSetsSchema.parse(rawTeamNameSets) satisfies readonly TeamNameSet[];

export function getTeamNameSet(teamIndex: number): TeamNameSet {
  return teamNameSets[teamIndex % teamNameSets.length]!;
}
