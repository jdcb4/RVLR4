import { z } from "zod";

import { createDefaultSettings } from "@/domain/whowhatwhere/setup";
import { CATEGORIES, type MatchState } from "@/domain/whowhatwhere/types";

import {
  count,
  leaderboardEntry,
  person,
  player,
  team,
  timestamp,
  validTeamReferences,
} from "./common";

const defaults = createDefaultSettings();
const skipLimit = z.union([z.literal(-1), z.literal(1), z.literal(2), z.literal(3)]);
const hintLimit = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
const settings = z.object({
  teamCount: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(defaults.teamCount),
  turnDurationSeconds: z
    .union([z.literal(30), z.literal(45), z.literal(60), z.literal(75)])
    .default(defaults.turnDurationSeconds),
  totalRounds: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
    .default(defaults.totalRounds),
  skipLimit: skipLimit.default(defaults.skipLimit),
  selectedCategories: z
    .array(z.enum(CATEGORIES))
    .min(1)
    .max(3)
    .default([...defaults.selectedCategories]),
  difficultyMode: z.enum(["easy", "hard"]).default(defaults.difficultyMode),
  hints: z
    .object({
      enabled: z.boolean().default(defaults.hints.enabled),
      perTurnLimit: hintLimit.default(defaults.hints.perTurnLimit),
    })
    .default(defaults.hints),
});
export const whoWhatWhereSetupSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    settings,
    teams: z
      .array(z.object({ id: z.string().min(1), name: z.string(), players: z.array(person).max(6) }))
      .min(2)
      .max(4),
  })
  .refine(
    (value) =>
      value.teams.length === value.settings.teamCount &&
      new Set(value.teams.map(({ id }) => id)).size === value.teams.length,
    "Invalid teams.",
  );

const word = z.object({
  word: z.string(),
  category: z.enum(CATEGORIES),
  hint: z.string().default(""),
});
const skippedWord = z.object({ id: z.string(), word });
const history = z.object({
  word,
  status: z.enum(["correct", "skipped"]),
  source: z.enum(["main", "skipped"]),
  timestamp,
});
const summary = z.object({
  teamId: z.string(),
  teamName: z.string(),
  describerId: z.string(),
  describerName: z.string(),
  scoreDelta: count,
  correctCount: count,
  skippedCount: count,
  pendingSkippedCount: count,
  wordHistory: z.array(history),
  finalWord: word.nullable(),
});
const turn = z
  .object({
    startedAt: timestamp,
    endsAt: timestamp,
    durationSeconds: z.number().positive(),
    category: z.enum(CATEGORIES),
    wordQueue: z.array(word),
    queueIndex: count,
    currentWordSource: z.enum(["main", "skipped"]),
    currentSkippedWord: skippedWord.nullable(),
    score: count,
    correctCount: count,
    skippedCount: count,
    skipLimit,
    skippedWords: z.array(skippedWord),
    nextSkippedWordId: count,
    wordHistory: z.array(history),
    hintsRemaining: hintLimit.optional(),
    currentWordHintRevealed: z.boolean().default(false),
  })
  .refine(
    (value) =>
      value.queueIndex <= value.wordQueue.length &&
      (value.currentWordSource !== "skipped" || value.currentSkippedWord !== null),
    "Invalid word queue.",
  );
const match = z
  .object({
    gameId: z.literal("whowhatwhere"),
    players: z.array(player).min(4).max(24),
    teams: z.array(team).min(2).max(4),
    settings,
    stage: z.enum(["ready", "turn", "finalSummary", "results"]),
    roundNumber: count,
    teamOrder: z.array(z.string()),
    teamIndex: count,
    describerIndexes: z.record(count),
    activeTurn: turn.nullable(),
    lastTurnSummary: summary.nullable(),
    turnSummaries: z.array(summary).default([]),
    results: z
      .object({
        leaderboard: z.array(leaderboardEntry),
        winnerTeamIds: z.array(z.string()),
        isTie: z.boolean(),
        bestTurn: z
          .object({
            teamId: z.string(),
            teamName: z.string(),
            describerId: z.string(),
            describerName: z.string(),
            scoreDelta: count,
          })
          .nullable()
          .default(null),
      })
      .nullable(),
    wordReserves: z.object({
      Who: z.array(word).optional(),
      What: z.array(word).optional(),
      Where: z.array(word).optional(),
    }),
  })
  .refine(
    (value) => validTeamReferences(value) && (value.stage !== "turn" || value.activeTurn !== null),
    "Invalid match references.",
  )
  .transform(
    (value): MatchState => ({
      ...value,
      wordReserves: Object.fromEntries(
        Object.entries(value.wordReserves).filter(([, words]) => words !== undefined),
      ) as MatchState["wordReserves"],
      activeTurn: value.activeTurn
        ? {
            ...value.activeTurn,
            hintsRemaining: value.activeTurn.hintsRemaining ?? value.settings.hints.perTurnLimit,
          }
        : null,
    }),
  );

export const whoWhatWhereMatchSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  savedAt: timestamp,
  match,
});
