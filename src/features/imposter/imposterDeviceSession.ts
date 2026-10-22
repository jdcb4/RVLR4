import { z } from "zod";

import { maxImpostersForPlayers } from "@/domain/imposter/round";
import type { ImposterSnapshot } from "@/domain/imposter/types";
import { createInitialImposterSnapshot } from "@/features/imposter/imposterSingleplayerTransitions";

export const IMPOSTER_DEVICE_SESSION_KEY = "imposter.device-session.v1";

const snapshotSchema = z
  .object({
    step: z.enum([
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
    imposterCount: z.number().int().min(1).max(2),
    wordDifficulty: z.enum(["all", "easy", "medium", "hard"]).default("all"),
    players: z
      .array(z.object({ id: z.string().min(1), name: z.string().max(80) }))
      .min(4)
      .max(10),
    round: z
      .object({
        secretWord: z.string().min(1).max(80),
        imposterPlayerIds: z.array(z.string()).min(1).max(2),
        revealPlayerIndex: z.number().int().nonnegative(),
        // Visibility is owned by the current foreground view, never restored from disk.
        revealRevealed: z.literal(false),
      })
      .nullable(),
  })
  .refine((value) => {
    const ids = new Set(value.players.map((player) => player.id));
    if (
      value.players.length !== value.playerCount ||
      ids.size !== value.playerCount ||
      value.imposterCount > maxImpostersForPlayers(value.playerCount)
    )
      return false;
    const setup = ["settings", "roster", "review"].includes(value.step);
    if (setup) return value.round === null;
    return Boolean(
      value.round &&
      value.round.revealPlayerIndex < value.playerCount &&
      value.round.imposterPlayerIds.length === value.imposterCount &&
      new Set(value.round.imposterPlayerIds).size === value.imposterCount &&
      value.round.imposterPlayerIds.every((id) => ids.has(id)) &&
      value.players.every((player) => player.name.trim()),
    );
  }, "Invalid Imposter roster or round references.");

export const imposterDeviceSessionSchema = z.object({
  schemaVersion: z.literal(1),
  savedAt: z.string().datetime(),
  snapshot: snapshotSchema,
});

export type ImposterDeviceSession = z.infer<typeof imposterDeviceSessionSchema>;

export function createImposterDeviceSession(): ImposterDeviceSession {
  const snapshot = createInitialImposterSnapshot("settings");
  return {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    snapshot: { ...snapshot, step: "settings", round: null },
  };
}

export function concealImposterSnapshot(
  snapshot: ImposterSnapshot,
): ImposterDeviceSession["snapshot"] {
  return {
    ...snapshot,
    step: snapshot.step === "landing" ? "settings" : snapshot.step,
    round: snapshot.round
      ? {
          secretWord: snapshot.round.secretWord,
          imposterPlayerIds: [...snapshot.round.imposterPlayerIds],
          revealPlayerIndex: snapshot.round.revealPlayerIndex,
          revealRevealed: false,
        }
      : null,
  };
}
