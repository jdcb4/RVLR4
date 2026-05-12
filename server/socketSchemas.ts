import { z } from "zod";

import { GAME_DEFAULTS } from "@/config/hatGameDefaults";
import { TEAM_COUNT_OPTIONS } from "@/config/teamRoster";

/**
 * Zod schemas for every Socket.IO event payload accepted by the server.
 *
 * Coverage philosophy:
 * - For events whose payload shape is known and small, validate tightly here.
 * - For events whose inner runtime (`hostPatch*`, etc.) already performs
 *   field-by-field validation, accept `z.unknown()` at this layer to avoid
 *   duplicating that validation surface; the inner function still throws on
 *   bad input and the wrapper turns the throw into an `{ok:false}` ack.
 * - Events with no meaningful payload (`_payload: unknown` in handlers) accept
 *   anything; the schema exists purely so the wrapper has something to call.
 *
 * If you change a handler's expected payload shape, update the schema here in
 * the same change.
 */

const teamCountSchema = z
  .number()
  .int()
  .refine((value): value is 2 | 3 | 4 =>
    (TEAM_COUNT_OPTIONS as readonly number[]).includes(value),
  );

// teamIndex is 0-based; max bench is 4 teams (`MAX_TEAMS` in lobbyControl.ts).
const teamIndexSchema = z.number().int().min(0).max(3);

const clueIndexSchema = z
  .number()
  .int()
  .min(0)
  .max(GAME_DEFAULTS.cluesPerPlayer - 1);

const playerNameSchema = z.string().max(64);

const ignoredPayloadSchema = z.unknown();

const imposterDispatchSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("reveal-show-role") }),
  z.object({ type: z.literal("reveal-confirm-next") }),
  z.object({ type: z.literal("guide-pregame-done") }),
  z.object({ type: z.literal("guide-prediscussion-done") }),
  z.object({ type: z.literal("guide-warning-done") }),
]);

export const socketSchemas = {
  "room:optOutResume": ignoredPayloadSchema,
  "lobby:setReady": z.object({ ready: z.boolean() }),
  "lobby:setName": z.object({ name: playerNameSchema }),
  "lobby:moveSelf": z.object({ teamIndex: teamIndexSchema }),
  "lobby:hostMovePlayer": z.object({
    playerId: z.string().min(1).max(128),
    teamIndex: teamIndexSchema,
  }),
  "lobby:hostSetTeamCount": z.object({ teamCount: teamCountSchema }),
  "lobby:hostSetTeamName": z.object({
    teamIndex: teamIndexSchema,
    name: z.string().max(64),
  }),
  "lobby:captainSetTeamName": z.object({
    teamIndex: teamIndexSchema,
    name: z.string().max(64),
  }),
  // hostPatchWhoWhatWhereSettings/HatPrefs/ImposterCounts have inner validation in
  // server/lobbyControl.ts that throws on bad fields. Keep that as the source
  // of truth rather than duplicating it here.
  "lobby:hostPatchWhoWhatWhereSettings": z.unknown(),
  "lobby:hostPatchHatPrefs": z.unknown(),
  "lobby:hostPatchImposterCounts": z.unknown(),
  "lobby:startGame": ignoredPayloadSchema,
  "imposter:dispatch": imposterDispatchSchema,
  "lobby:hatSetClueCell": z.object({
    clueIndex: clueIndexSchema,
    value: z.string().max(GAME_DEFAULTS.maxClueLength * 2),
  }),
  "lobby:hatSuggestClue": z.object({ clueIndex: clueIndexSchema }),
  "game:hostOfferReplay": ignoredPayloadSchema,
  "game:acceptReplay": ignoredPayloadSchema,
  "www:markReady": ignoredPayloadSchema,
  "www:startTurn": ignoredPayloadSchema,
  "www:correct": ignoredPayloadSchema,
  "www:skip": ignoredPayloadSchema,
  "www:returnSkipped": z.object({ skippedWordId: z.string().min(1).max(128) }),
  "www:revealHint": ignoredPayloadSchema,
  "www:endTurn": ignoredPayloadSchema,
  "www:finalScores": ignoredPayloadSchema,
  "hat:startTurn": ignoredPayloadSchema,
  "hat:endTurn": ignoredPayloadSchema,
  "hat:markCorrect": ignoredPayloadSchema,
  "hat:skipClue": ignoredPayloadSchema,
  "hat:returnSkipped": z.object({ poolIndex: z.number().int().min(0).max(255) }),
  "hat:viewResults": ignoredPayloadSchema,
} as const;

export type SocketEventName = keyof typeof socketSchemas;

export type SocketPayload<E extends SocketEventName> = z.infer<
  (typeof socketSchemas)[E]
>;

export const sessionBindSchema = z.object({
  code: z.string().min(1).max(16),
  playerId: z.string().min(1).max(128),
  secret: z.string().min(1).max(256),
});
