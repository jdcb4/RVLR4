import { z } from "zod";

import { GAME_DEFAULTS } from "@/config/hatDefaults";
import { MAX_PLAYERS_PER_TEAM } from "@/config/teamRoster";
import rawHatNameData from "@/data/hatNameData.json";
import {
  addDuplicateIssues,
  staticTextSchema,
  uniqueStaticTextListSchema,
} from "@/data/staticDataSchemas";

const playerNamesSchema = uniqueStaticTextListSchema(
  staticTextSchema.max(GAME_DEFAULTS.maxNameLength),
).refine(
  (names) => names.length >= MAX_PLAYERS_PER_TEAM,
  `Each pack needs at least ${MAX_PLAYERS_PER_TEAM} player names.`,
);

const namePackSchema = z
  .object({
    teamName: staticTextSchema.max(GAME_DEFAULTS.maxNameLength),
    playerNames: playerNamesSchema,
  })
  .strict();

export const hatNameDataSchema = z
  .object({
    packs: z
      .array(namePackSchema)
      .min(GAME_DEFAULTS.maxTeams)
      .superRefine((packs, context) => {
        addDuplicateIssues(packs, (pack) => pack.teamName, context, "team name");
      }),
    fallbackNames: uniqueStaticTextListSchema(staticTextSchema.max(GAME_DEFAULTS.maxNameLength)),
  })
  .strict();

export type HatNameData = {
  readonly packs: readonly {
    readonly teamName: string;
    readonly playerNames: readonly string[];
  }[];
  readonly fallbackNames: readonly string[];
};

const nameData = hatNameDataSchema.parse(rawHatNameData) satisfies HatNameData;

export function getHatNameData(): HatNameData {
  return nameData;
}
