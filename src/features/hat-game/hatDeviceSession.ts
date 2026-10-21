import { z } from "zod";

import { GAME_DEFAULTS } from "@/config/hatDefaults";
import type { HatGameSession } from "@/domain/hat-game/types";
import type { AppSnapshot } from "@/features/hat-game/hatSingleplayerAppTypes";
import { createInitialHatSnapshot } from "@/features/hat-game/hatSingleplayerTransitions";
import { hatSavedStateSchema } from "@/services/savedStates/hat";
import { remainingTurnMs, turnDeadline } from "@/services/turnClock";

export const HAT_DEVICE_SESSION_KEY = "hat.device-session.v1";

export type HatDeviceSession = {
  schemaVersion: 1;
  savedAt: string;
  snapshot: AppSnapshot;
  remainingMs: number | null;
  paused: boolean;
  recap: boolean;
};

// Reuse the domain's nested validation; the native envelope itself has no legacy migration.
const snapshotSchema = z.unknown().transform((value, context): AppSnapshot => {
  const parsed = hatSavedStateSchema.safeParse({
    schemaVersion: 1,
    lastSavedAt: new Date().toISOString(),
    snapshot: value,
  });
  if (parsed.success) return parsed.data.snapshot;
  context.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Invalid Hat setup or match.",
    fatal: true,
  });
  return z.NEVER;
});

function validReferences(snapshot: AppSnapshot): boolean {
  const { players, teams, session } = snapshot;
  const playerIds = new Set(players.map((player) => player.id));
  const teamIds = new Set(teams.map((team) => team.id));
  if (
    playerIds.size !== players.length ||
    teamIds.size !== teams.length ||
    players.some((player) => !teamIds.has(player.teamId)) ||
    Object.entries(snapshot.clueSubmissions).some(
      ([id, submission]) =>
        !playerIds.has(id) ||
        submission.clues.length !== GAME_DEFAULTS.cluesPerPlayer ||
        submission.clues.some((clue) => clue.length > GAME_DEFAULTS.maxClueLength),
    ) ||
    (snapshot.step !== "settings" &&
      snapshot.step !== "landing" &&
      (teams.length !== snapshot.teamCount || players.length !== snapshot.playerCount)) ||
    (snapshot.step === "team" && snapshot.teamEditIndex >= teams.length) ||
    (snapshot.step === "clues" && snapshot.clueEntryIndex >= players.length)
  )
    return false;
  if (!session) return snapshot.step !== "game";
  if (snapshot.step !== "game") return false;
  const validIndex = (index: number) => index >= 0 && index < session.cluePool.length;
  const validHistory = (entries: NonNullable<HatGameSession["activeTurn"]>["clueHistory"]) =>
    entries.every(
      (entry) =>
        validIndex(entry.poolIndex) &&
        entry.clue === session.cluePool[entry.poolIndex]?.text &&
        (entry.phaseNumber === undefined || (entry.phaseNumber >= 1 && entry.phaseNumber <= 3)),
    );
  const turn = session.activeTurn;
  return (
    session.cluePool.length > 0 &&
    session.settings.teamCount === session.teams.length &&
    session.players.every((player) => playerIds.has(player.id)) &&
    session.teams.every((team) => teamIds.has(team.id)) &&
    session.cluePool.every(
      (clue) => playerIds.has(clue.submittedBy) && clue.text.trim().length > 0,
    ) &&
    new Set(session.usedCluePoolIndices).size === session.usedCluePoolIndices.length &&
    (session.lastSeenCluePoolIndex == null || validIndex(session.lastSeenCluePoolIndex)) &&
    (session.stage === "turn" ? Boolean(turn) : turn === null) &&
    (!turn ||
      (turn.queueIndex < turn.clueQueue.length &&
        new Set(turn.clueQueue.map((clue) => clue.poolIndex)).size === turn.clueQueue.length &&
        turn.clueQueue.every((clue) => clue.text === session.cluePool[clue.poolIndex]?.text) &&
        turn.skippedClues.every(
          (clue) =>
            validIndex(clue.poolIndex) &&
            clue.text === session.cluePool[clue.poolIndex]?.text &&
            turn.clueQueue
              .slice(turn.queueIndex)
              .some((queued) => queued.poolIndex === clue.poolIndex),
        ) &&
        (turn.currentSkippedCluePoolIndex === null ||
          turn.currentSkippedCluePoolIndex === turn.clueQueue[turn.queueIndex]?.poolIndex) &&
        validHistory(turn.clueHistory))) &&
    (!session.lastTurnSummary || validHistory(session.lastTurnSummary.clues)) &&
    (["finalSummary", "results"].includes(session.stage) ? Boolean(session.results) : true)
  );
}

export const hatDeviceSessionSchema = z
  .object({
    schemaVersion: z.literal(1),
    savedAt: z.string().datetime(),
    snapshot: snapshotSchema,
    remainingMs: z.number().finite().min(0).max(75_000).nullable(),
    paused: z.boolean(),
    recap: z.boolean(),
  })
  .refine((value) => {
    const match = value.snapshot.session;
    return (
      validReferences(value.snapshot) &&
      (match?.stage === "turn"
        ? value.remainingMs !== null &&
          value.remainingMs <= match.settings.turnDurationSeconds * 1000
        : value.remainingMs === null) &&
      (!value.recap ||
        Boolean(
          match?.lastTurnSummary && (match.stage === "ready" || match.stage === "finalSummary"),
        ))
    );
  }, "The saved Hat position, clue references or timer are invalid.")
  .transform((value): HatDeviceSession => value);

export function createHatDeviceSession(): HatDeviceSession {
  return {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    snapshot: createInitialHatSnapshot(),
    remainingMs: null,
    paused: false,
    recap: false,
  };
}

export function sampleHatDeviceSession(
  session: HatDeviceSession,
  anchor: number,
  now: number,
): HatDeviceSession {
  if (session.paused || session.snapshot.session?.stage !== "turn" || session.remainingMs === null)
    return session;
  return { ...session, remainingMs: remainingTurnMs(session.remainingMs, anchor, now) };
}

export function rebaseHatTurn(match: HatGameSession, remainingMs: number): HatGameSession {
  if (!match.activeTurn) return match;
  return { ...match, activeTurn: { ...match.activeTurn, endsAt: turnDeadline(remainingMs) } };
}
