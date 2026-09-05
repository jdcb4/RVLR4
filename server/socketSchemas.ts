import { z } from "zod";

import { GAME_DEFAULTS } from "@/config/hatDefaults";
import { TEAM_COUNT_OPTIONS } from "@/config/teamRoster";
import {
  DRAWNGUESS_MAX_GUESS_LENGTH,
  DRAWNGUESS_MAX_POINTS_PER_STROKE,
  DRAWNGUESS_MAX_PROMPT_LENGTH,
  DRAWNGUESS_MAX_SERIALIZED_DRAWING_BYTES,
  DRAWNGUESS_MAX_STROKES,
  DRAWNGUESS_MAX_TOTAL_POINTS,
} from "@/domain/drawnguess/types";
import { CATEGORIES, HINT_LIMIT_OPTIONS } from "@/domain/whowhatwhere/types";

/**
 * Zod schemas for every Socket.IO event payload accepted by the server.
 *
 * If you change a handler's expected payload shape, update the schema here in
 * the same change.
 */

const teamCountSchema = z
  .number()
  .int()
  .refine((value): value is 2 | 3 | 4 => (TEAM_COUNT_OPTIONS as readonly number[]).includes(value));

// teamIndex is 0-based; max bench is 4 teams (`MAX_TEAMS` in lobbyControl.ts).
const teamIndexSchema = z.number().int().min(0).max(3);

const clueIndexSchema = z
  .number()
  .int()
  .min(0)
  .max(GAME_DEFAULTS.cluesPerPlayer - 1);

const normalizedNameSchema = (max: number) =>
  z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, " "))
    .pipe(z.string().min(1).max(max));

const noPayloadSchema = z.undefined();
const drawNGuessTurnKeySchema = z.string().min(1).max(80).optional();

function definedFields<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as {
    [Key in keyof T]: Exclude<T[Key], undefined>;
  };
}

function nonEmptyPatch<T extends z.ZodRawShape>(shape: T) {
  return z
    .object(shape)
    .strict()
    .partial()
    .transform(definedFields)
    .refine((value) => Object.keys(value).length > 0, "At least one setting is required.");
}

const wwwSettingsSchema = z
  .object({
    teamCount: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    turnDurationSeconds: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(75)]),
    totalRounds: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    skipLimit: z.union([z.literal(-1), z.literal(1), z.literal(2), z.literal(3)]),
    selectedCategories: z.array(z.enum(CATEGORIES)).min(1).max(CATEGORIES.length),
    difficultyMode: z.enum(["easy", "hard"]),
    hints: z
      .object({
        enabled: z.boolean(),
        perTurnLimit: z.union([
          z.literal(HINT_LIMIT_OPTIONS[0]),
          z.literal(HINT_LIMIT_OPTIONS[1]),
          z.literal(HINT_LIMIT_OPTIONS[2]),
          z.literal(HINT_LIMIT_OPTIONS[3]),
        ]),
      })
      .strict(),
  })
  .strict()
  .partial()
  .transform(definedFields)
  .refine((value) => Object.keys(value).length > 0, "At least one setting is required.");

const drawNGuessPointSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  })
  .strict();

const drawNGuessStrokeSchema = z
  .object({
    id: z.string().min(1).max(128),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    size: z.number().min(1).max(64),
    tool: z.enum(["pen", "eraser"]),
    points: z.array(drawNGuessPointSchema).max(DRAWNGUESS_MAX_POINTS_PER_STROKE),
  })
  .strict();

const drawNGuessDrawingSchema = z
  .object({
    format: z.literal("strokes-v1"),
    width: z.number().int().min(1).max(4096),
    height: z.number().int().min(1).max(4096),
    strokes: z.array(drawNGuessStrokeSchema).max(DRAWNGUESS_MAX_STROKES),
  })
  .strict()
  .superRefine((drawing, context) => {
    const totalPoints = drawing.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0);

    if (totalPoints > DRAWNGUESS_MAX_TOTAL_POINTS) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Drawing has too many points." });
    }

    if (
      Buffer.byteLength(JSON.stringify(drawing), "utf8") > DRAWNGUESS_MAX_SERIALIZED_DRAWING_BYTES
    ) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Drawing is too large." });
    }
  });

const imposterDispatchSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("reveal-show-role") }).strict(),
  z.object({ type: z.literal("reveal-confirm-next") }).strict(),
  z.object({ type: z.literal("guide-pregame-done") }).strict(),
  z.object({ type: z.literal("guide-prediscussion-done") }).strict(),
  z.object({ type: z.literal("guide-warning-done") }).strict(),
]);

export const socketSchemas = {
  "room:optOutResume": noPayloadSchema,
  "lobby:setReady": z.object({ ready: z.boolean() }).strict(),
  "lobby:setName": z.object({ name: normalizedNameSchema(32) }).strict(),
  "lobby:moveSelf": z.object({ teamIndex: teamIndexSchema }).strict(),
  "lobby:hostMovePlayer": z
    .object({
      playerId: z.string().uuid(),
      teamIndex: teamIndexSchema,
    })
    .strict(),
  "lobby:hostSetTeamCount": z.object({ teamCount: teamCountSchema }).strict(),
  "lobby:hostSetTeamName": z
    .object({
      teamIndex: teamIndexSchema,
      name: normalizedNameSchema(24),
    })
    .strict(),
  "lobby:captainSetTeamName": z
    .object({
      teamIndex: teamIndexSchema,
      name: normalizedNameSchema(24),
    })
    .strict(),
  "lobby:hostPatchWhoWhatWhereSettings": z.object({ patch: wwwSettingsSchema }).strict(),
  "lobby:hostPatchHatPrefs": nonEmptyPatch({
    hatTurnDurationSeconds: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(75)]),
    hatSkipsPerTurn: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }),
  "lobby:hostPatchImposterCounts": nonEmptyPatch({
    imposterImposterCount: z.number().int().positive(),
  }),
  "lobby:hostPatchDrawNGuessSettings": nonEmptyPatch({
    startingPromptMode: z.enum(["predetermined", "custom"]),
    drawingDurationMs: z.union([
      z.literal(45_000),
      z.literal(60_000),
      z.literal(90_000),
      z.literal(120_000),
    ]),
    guessDurationMs: z.union([
      z.literal(20_000),
      z.literal(30_000),
      z.literal(45_000),
      z.literal(60_000),
    ]),
  }),
  "lobby:startGame": noPayloadSchema,
  "imposter:dispatch": imposterDispatchSchema,
  "lobby:hatSetClueCell": z
    .object({
      clueIndex: clueIndexSchema,
      value: z.string().max(GAME_DEFAULTS.maxClueLength),
    })
    .strict(),
  "lobby:hatSuggestClue": z.object({ clueIndex: clueIndexSchema }).strict(),
  "game:hostOfferReplay": noPayloadSchema,
  "game:acceptReplay": z.object({ offerId: z.string().uuid() }).strict().optional(),
  "www:markReady": noPayloadSchema,
  "www:startTurn": noPayloadSchema,
  "www:correct": noPayloadSchema,
  "www:skip": noPayloadSchema,
  "www:returnSkipped": z.object({ skippedWordId: z.string().min(1).max(128) }).strict(),
  "www:revealHint": noPayloadSchema,
  "www:endTurn": noPayloadSchema,
  "www:showFinalScores": noPayloadSchema,
  "hat:startTurn": noPayloadSchema,
  "hat:endTurn": noPayloadSchema,
  "hat:correct": noPayloadSchema,
  "hat:skip": noPayloadSchema,
  "hat:returnSkipped": z.object({ poolIndex: z.number().int().min(0).max(255) }).strict(),
  "hat:showFinalScores": noPayloadSchema,
  "drawnguess:updatePromptDraft": z
    .object({
      turnKey: drawNGuessTurnKeySchema,
      text: z.string().max(DRAWNGUESS_MAX_PROMPT_LENGTH),
    })
    .strict(),
  "drawnguess:submitPrompt": z
    .object({
      turnKey: drawNGuessTurnKeySchema,
      text: z.string().max(DRAWNGUESS_MAX_PROMPT_LENGTH),
    })
    .strict(),
  "drawnguess:updateDrawingDraft": z
    .object({ drawing: drawNGuessDrawingSchema, turnKey: drawNGuessTurnKeySchema })
    .strict(),
  "drawnguess:submitDrawing": z
    .object({ drawing: drawNGuessDrawingSchema, turnKey: drawNGuessTurnKeySchema })
    .strict(),
  "drawnguess:updateGuessDraft": z
    .object({
      turnKey: drawNGuessTurnKeySchema,
      text: z.string().max(DRAWNGUESS_MAX_GUESS_LENGTH),
    })
    .strict(),
  "drawnguess:submitGuess": z
    .object({
      turnKey: drawNGuessTurnKeySchema,
      text: z.string().max(DRAWNGUESS_MAX_GUESS_LENGTH),
    })
    .strict(),
  "drawnguess:advanceTurn": noPayloadSchema,
  "drawnguess:advanceReveal": z
    .object({
      direction: z.enum(["next", "previous"]).default("next"),
    })
    .strict(),
  "drawnguess:openRevealPacket": z
    .object({
      starterPlayerId: z.string().uuid(),
    })
    .strict(),
} as const;

export type SocketEventName = keyof typeof socketSchemas;

export type SocketPayload<E extends SocketEventName> = z.infer<(typeof socketSchemas)[E]>;

export const sessionBindSchema = z
  .object({
    code: z
      .string()
      .transform((value) => value.trim().toUpperCase())
      .pipe(z.string().regex(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/)),
    playerId: z.string().uuid(),
    secret: z.string().regex(/^[A-Za-z0-9_-]{32}$/),
  })
  .strict();
