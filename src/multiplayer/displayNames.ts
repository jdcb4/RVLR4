import rawDisplayNames from "@/data/multiplayerDisplayNames.json";
import { staticTextSchema, uniqueStaticTextListSchema } from "@/data/staticDataSchemas";

export const multiplayerDisplayNamesSchema = uniqueStaticTextListSchema(staticTextSchema.max(32));

const displayNames = multiplayerDisplayNamesSchema.parse(rawDisplayNames);

export function getMultiplayerDisplayNames(): readonly string[] {
  return displayNames;
}
