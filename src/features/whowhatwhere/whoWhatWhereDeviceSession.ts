import { z } from "zod";

import { type MatchPoolWord, matchWordPoolSchema } from "@/domain/whowhatwhere/matchWordPool";
import { createDefaultSettings, createTeamSetups } from "@/domain/whowhatwhere/setup";
import type { GameSettings, MatchState, TeamSetup } from "@/domain/whowhatwhere/types";
import type { WhoWhatWhereAppMode } from "@/features/whowhatwhere/whoWhatWhereSingleplayerTransitions";
import {
  whoWhatWhereMatchSchema,
  whoWhatWhereSetupSchema,
} from "@/services/savedStates/whowhatwhere";
import { remainingTurnMs, turnDeadline } from "@/services/turnClock";

export const WHO_WHAT_WHERE_SESSION_KEY = "whowhatwhere.device-session.v1";

/** One atomic record owns the draft, navigation position, generated deck and turn clock. */
export type WhoWhatWhereDeviceSession = {
  readonly schemaVersion: 1;
  readonly savedAt: string;
  readonly setup: {
    readonly schemaVersion: 1;
    readonly settings: GameSettings;
    readonly teams: readonly TeamSetup[];
  };
  readonly mode: WhoWhatWhereAppMode;
  readonly teamStep: number;
  readonly match: MatchState | null;
  /** Captured at match creation; downloaded updates apply to the next match. */
  readonly wordPool?: readonly MatchPoolWord[] | null | undefined;
  readonly remainingMs: number | null;
  readonly paused: boolean;
  /** The engine already points at the next team while the completed turn is reviewed. */
  readonly presentationStage?: "recap" | "roundComplete" | null;
};

export const whoWhatWhereDeviceSessionSchema = z
  .object({
    schemaVersion: z.literal(1),
    savedAt: z.string().datetime(),
    setup: whoWhatWhereSetupSchema,
    mode: z.enum([
      "landing",
      "settings",
      "team",
      "review",
      "ready",
      "turn",
      "finalSummary",
      "results",
    ]),
    teamStep: z.number().int().nonnegative(),
    match: whoWhatWhereMatchSchema.shape.match.nullable(),
    wordPool: matchWordPoolSchema.nullable().optional(),
    remainingMs: z.number().finite().min(0).max(75_000).nullable(),
    paused: z.boolean(),
    presentationStage: z.enum(["recap", "roundComplete"]).nullable().default(null),
  })
  .refine(
    (value) =>
      value.teamStep < value.setup.settings.teamCount &&
      (value.match
        ? value.mode === value.match.stage
        : ["landing", "settings", "team", "review"].includes(value.mode)) &&
      (value.match?.stage === "turn"
        ? value.remainingMs !== null &&
          value.remainingMs <= value.match.settings.turnDurationSeconds * 1000
        : value.remainingMs === null) &&
      (!value.presentationStage ||
        (Boolean(value.match?.lastTurnSummary) &&
          (value.presentationStage === "recap"
            ? value.match?.stage === "ready" || value.match?.stage === "finalSummary"
            : value.match?.stage === "ready" && value.match.teamIndex === 0))),
    "The saved setup position or turn clock is invalid.",
  )
  .transform((value): WhoWhatWhereDeviceSession => value);

export function createWhoWhatWhereDeviceSession(): WhoWhatWhereDeviceSession {
  const settings = createDefaultSettings();
  return {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    setup: { schemaVersion: 1, settings, teams: createTeamSetups(settings.teamCount) },
    mode: "settings",
    teamStep: 0,
    match: null,
    wordPool: null,
    remainingMs: null,
    paused: false,
    presentationStage: null,
  };
}

/** A wall-clock deadline is only an adapter for the existing game engine. */
export function rebaseWhoWhatWhereTurn(match: MatchState, remainingMs: number): MatchState {
  if (match.stage !== "turn" || !match.activeTurn) return match;
  return {
    ...match,
    activeTurn: {
      ...match.activeTurn,
      endsAt: turnDeadline(remainingMs),
    },
  };
}

/** performance.now is monotonic and cannot jump when the phone clock changes. */
export function sampleWhoWhatWhereSession(
  session: WhoWhatWhereDeviceSession,
  anchor: number,
  now: number,
): WhoWhatWhereDeviceSession {
  if (session.paused || session.match?.stage !== "turn" || session.remainingMs === null) {
    return session;
  }
  return { ...session, remainingMs: remainingTurnMs(session.remainingMs, anchor, now) };
}
