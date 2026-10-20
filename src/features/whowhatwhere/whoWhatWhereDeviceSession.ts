import { z } from "zod";

import { createDefaultSettings, createTeamSetups } from "@/domain/whowhatwhere/setup";
import type { GameSettings, MatchState, TeamSetup } from "@/domain/whowhatwhere/types";
import type { WhoWhatWhereAppMode } from "@/features/whowhatwhere/whoWhatWhereSingleplayerTransitions";
import {
  whoWhatWhereMatchSchema,
  whoWhatWhereSetupSchema,
} from "@/services/savedStates/whowhatwhere";

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
  readonly remainingMs: number | null;
  readonly paused: boolean;
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
    remainingMs: z.number().finite().min(0).max(75_000).nullable(),
    paused: z.boolean(),
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
        : value.remainingMs === null),
    "The saved setup position or turn clock is invalid.",
  )
  .transform((value): WhoWhatWhereDeviceSession => value);

export function createWhoWhatWhereDeviceSession(): WhoWhatWhereDeviceSession {
  const settings = createDefaultSettings();
  return {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    setup: { schemaVersion: 1, settings, teams: createTeamSetups(settings.teamCount) },
    mode: "landing",
    teamStep: 0,
    match: null,
    remainingMs: null,
    paused: false,
  };
}

/** A wall-clock deadline is only an adapter for the existing game engine. */
export function rebaseWhoWhatWhereTurn(match: MatchState, remainingMs: number): MatchState {
  if (match.stage !== "turn" || !match.activeTurn) return match;
  return {
    ...match,
    activeTurn: {
      ...match.activeTurn,
      endsAt: new Date(Date.now() + Math.max(0, remainingMs)).toISOString(),
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
  return { ...session, remainingMs: Math.max(0, session.remainingMs - Math.max(0, now - anchor)) };
}
