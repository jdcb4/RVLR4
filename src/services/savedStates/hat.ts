import { z } from "zod";

import { GAME_DEFAULTS } from "@/config/hatDefaults";
import type { StoragePayload } from "@/features/hat-game/hatSingleplayerAppTypes";

import {
  count,
  leaderboardEntry,
  player,
  team,
  timestamp,
  validTeamReferences,
  versionedSnapshot,
} from "./common";

const clue = z.object({ text: z.string(), submittedBy: z.string(), submittedByName: z.string() });
const history = z.object({
  clue: z.string(),
  status: z.enum(["correct", "skipped"]),
  timestamp,
  poolIndex: count,
  phaseNumber: count.optional(),
});
const bestTurn = z.object({
  teamId: z.string(),
  teamName: z.string(),
  describerId: z.string().nullable(),
  describerName: z.string(),
  score: count,
  phaseNumber: count,
  phaseName: z.string(),
});
const turn = z
  .object({
    startedAt: timestamp,
    endsAt: timestamp,
    durationSeconds: z.number().positive(),
    clueQueue: z.array(clue.extend({ poolIndex: count })),
    queueIndex: count,
    score: count,
    correctCount: count,
    skippedCount: count,
    skipsRemaining: z.number().int().min(-1),
    skippedClues: z.array(z.object({ poolIndex: count, text: z.string() })),
    currentSkippedCluePoolIndex: count.nullable(),
    clueHistory: z.array(history),
  })
  .refine((value) => value.queueIndex <= value.clueQueue.length, "Invalid clue queue position.");
const summary = z.object({
  teamId: z.string(),
  teamName: z.string(),
  describerId: z.string().nullable(),
  describerName: z.string(),
  scoreDelta: count,
  correctCount: count,
  skippedCount: count,
  clues: z.array(history),
  phaseCompleted: z.boolean(),
  completedPhaseNumber: count.nullable(),
  nextPhaseNumber: count.nullable(),
  nextPhaseName: z.string().nullable(),
});
const session = z
  .object({
    players: z.array(player).min(4).max(24),
    teams: z.array(team).min(2).max(4),
    settings: z.object({
      teamCount: z.number().int().min(2).max(4),
      turnDurationSeconds: z.number().positive(),
      cluesPerPlayer: z.number().int().positive(),
      skipsPerTurn: z.number().int().min(-1),
    }),
    stage: z.enum(["ready", "turn", "finalSummary", "results"]),
    roundNumber: count,
    phaseNumber: z.number().int().min(1).max(3),
    teamOrder: z.array(z.string()),
    teamIndex: count,
    describerIndexes: z.record(count),
    cluePool: z.array(clue),
    usedCluePoolIndices: z.array(count),
    lastSeenCluePoolIndex: count.nullable().optional(),
    activeTurn: turn.nullable(),
    lastTurnSummary: summary.nullable(),
    bestTurnSummary: bestTurn.nullable(),
    results: z
      .object({
        leaderboard: z.array(leaderboardEntry),
        winnerTeamIds: z.array(z.string()),
        isTie: z.boolean(),
        totalClues: count,
        bestTurn: bestTurn.nullable(),
      })
      .nullable(),
  })
  .refine(
    (value) =>
      validTeamReferences(value) &&
      (value.stage !== "turn" || value.activeTurn !== null) &&
      value.usedCluePoolIndices.every((index) => index < value.cluePool.length) &&
      (value.activeTurn?.clueQueue.every((entry) => entry.poolIndex < value.cluePool.length) ??
        true),
    "Invalid team or clue references.",
  );

const snapshot = z
  .object({
    step: z
      .enum(["landing", "counts", "settings", "team", "review", "clues", "game"])
      .transform((step) => (step === "counts" ? ("settings" as const) : step)),
    teamEditIndex: count,
    playerCount: count.max(24),
    teamCount: z.number().int().min(2).max(4),
    teams: z.array(team).max(4),
    players: z.array(player).max(24),
    clueSubmissions: z.record(z.object({ clues: z.array(z.string()) })),
    clueEntryIndex: count,
    clueEntryRevealed: z.boolean(),
    handoffRevealed: z.boolean(),
    session: session.nullable(),
    turnDurationSeconds: z.number().positive().default(GAME_DEFAULTS.turnDurationSeconds),
    skipsPerTurn: z.number().int().min(-1).default(GAME_DEFAULTS.skipsPerTurn),
  })
  .refine(
    (value) => value.step !== "game" || value.session !== null,
    "An active game requires a session.",
  );

export const hatSavedStateSchema = versionedSnapshot(snapshot).transform(
  (value) => value as StoragePayload,
);
