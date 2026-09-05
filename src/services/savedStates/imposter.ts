import { z } from "zod";

import { maxImpostersForPlayers } from "@/domain/imposter/round";
import type { ImposterStoragePayload } from "@/features/imposter/imposterSingleplayerAppTypes";

import { count, person, versionedSnapshot } from "./common";

const round = z.object({
  secretWord: z.string().min(1),
  imposterPlayerIds: z.array(z.string()),
  revealPlayerIndex: count,
  revealRevealed: z.boolean(),
  parallelRoleSeen: z.record(z.boolean()).optional(),
  parallelRevealDone: z.record(z.boolean()).optional(),
});
const snapshot = z
  .object({
    step: z.enum([
      "landing",
      "settings",
      "roster",
      "review",
      "reveal",
      "guidePregame",
      "guidePrediscussion",
      "guideWarning",
      "results",
    ]),
    playerCount: z.number().int().min(4).max(10),
    imposterCount: z.number().int().min(1).max(5),
    players: z.array(person).max(10),
    round: round.nullable(),
    cluesStartPlayerId: z.string().nullable().optional(),
  })
  .refine((value) => {
    const ids = new Set(value.players.map(({ id }) => id));
    if (
      ids.size !== value.players.length ||
      value.imposterCount > maxImpostersForPlayers(value.playerCount)
    )
      return false;
    if (value.cluesStartPlayerId && !ids.has(value.cluesStartPlayerId)) return false;
    if (!["landing", "settings", "roster", "review"].includes(value.step) && !value.round)
      return false;
    if (!value.round) return true;
    return (
      value.players.length === value.playerCount &&
      value.round.revealPlayerIndex < value.players.length &&
      value.round.imposterPlayerIds.length === value.imposterCount &&
      new Set(value.round.imposterPlayerIds).size === value.imposterCount &&
      value.round.imposterPlayerIds.every((id) => ids.has(id))
    );
  }, "Invalid player or round references.");

export const imposterSavedStateSchema = versionedSnapshot(snapshot).transform(
  (value) => value as ImposterStoragePayload,
);
