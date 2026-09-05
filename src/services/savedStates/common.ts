import { z } from "zod";

export const count = z.number().int().nonnegative();
export const timestamp = z.string().datetime({ offset: true });
export const person = z.object({
  id: z.string().min(1),
  name: z.string(),
  avatarId: z.string().optional(),
});
export const player = person.extend({ seat: count, teamId: z.string().min(1) });
export const team = z.object({
  id: z.string().min(1),
  name: z.string(),
  score: z.number().finite(),
});
export const leaderboardEntry = z.object({
  teamId: z.string(),
  teamName: z.string(),
  score: z.number().finite(),
});

/** A legacy bare snapshot is supported; an unknown envelope version is never guessed. */
export function versionedSnapshot<S extends z.ZodTypeAny>(schema: S) {
  const envelope = z.object({
    schemaVersion: z.literal(1),
    lastSavedAt: timestamp,
    snapshot: schema,
  });
  return z.preprocess((value) => {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !("schemaVersion" in value) &&
      !("snapshot" in value)
    ) {
      return { schemaVersion: 1, lastSavedAt: new Date().toISOString(), snapshot: value };
    }
    return value;
  }, envelope);
}

export function validTeamReferences(value: {
  teams: readonly { id: string }[];
  players: readonly { id: string; teamId: string }[];
  teamOrder: readonly string[];
  teamIndex: number;
  describerIndexes: Readonly<Record<string, number>>;
}): boolean {
  const teamIds = new Set(value.teams.map(({ id }) => id));
  return (
    teamIds.size === value.teams.length &&
    new Set(value.players.map(({ id }) => id)).size === value.players.length &&
    value.teamIndex < value.teamOrder.length &&
    value.teamOrder.length === value.teams.length &&
    new Set(value.teamOrder).size === value.teamOrder.length &&
    value.teamOrder.every((id) => teamIds.has(id)) &&
    value.players.every((member) => teamIds.has(member.teamId)) &&
    value.teams.every(({ id }) => {
      const members = value.players.filter((member) => member.teamId === id);
      const index = value.describerIndexes[id];
      return (
        members.length >= 2 && members.length <= 6 && index !== undefined && index < members.length
      );
    })
  );
}
