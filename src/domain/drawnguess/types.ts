export const DRAWNGUESS_MIN_PLAYERS = 3;
export const DRAWNGUESS_MAX_PLAYERS = 8;
export const DRAWNGUESS_DEFAULT_WORD_PACK_ID = "easy-all";
export const DRAWNGUESS_DEFAULT_DRAWING_DURATION_MS = 60_000;
export const DRAWNGUESS_DEFAULT_GUESS_DURATION_MS = 30_000;
export const DRAWNGUESS_DEFAULT_GRACE_MS = 1_500;
export const DRAWNGUESS_MAX_GUESS_LENGTH = 42;
export const DRAWNGUESS_MAX_PROMPT_LENGTH = 42;
export const DRAWNGUESS_MAX_STROKES = 500;
export const DRAWNGUESS_MAX_POINTS_PER_STROKE = 2_000;

export type DrawNGuessPromptMode = "predetermined" | "custom";
export type DrawNGuessTurnMode = "custom-prompt" | "drawing" | "guessing";
export type DrawNGuessPhase = "custom-prompt" | "turn" | "reveal" | "complete";
export type DrawNGuessEntryType = "prompt" | "drawing" | "guess";

export type DrawNGuessSettings = {
  readonly startingPromptMode: DrawNGuessPromptMode;
  readonly wordPackId: string;
  readonly drawingDurationMs: number;
  readonly guessDurationMs: number;
  readonly customPromptDurationMs: number;
  readonly autoSubmitGraceMs: number;
};

export type DrawNGuessPlayer = {
  readonly id: string;
  readonly name: string;
};

export type DrawNGuessWordPrompt = {
  readonly phrase: string;
  readonly category: "Kids" | "Sports" | "Standard";
  readonly difficulty: "Easy" | "Hard";
};

export type DrawNGuessPoint = {
  readonly x: number;
  readonly y: number;
};

export type DrawNGuessStroke = {
  readonly id: string;
  readonly color: string;
  readonly size: number;
  readonly tool: "pen" | "eraser";
  readonly points: readonly DrawNGuessPoint[];
};

export type DrawNGuessDrawing =
  | {
      readonly format: "strokes-v1";
      readonly width: number;
      readonly height: number;
      readonly strokes: readonly DrawNGuessStroke[];
    }
  | {
      readonly format: "placeholder-v1";
      readonly text: string;
    };

export type DrawNGuessEntry =
  | {
      readonly type: "prompt";
      readonly playerId: "deck" | string;
      readonly text: string;
      readonly createdAt: number;
      readonly placeholder?: boolean;
    }
  | {
      readonly type: "drawing";
      readonly playerId: string;
      readonly drawing: DrawNGuessDrawing;
      readonly createdAt: number;
      readonly placeholder?: boolean;
    }
  | {
      readonly type: "guess";
      readonly playerId: string;
      readonly text: string;
      readonly createdAt: number;
      readonly placeholder?: boolean;
    };

export type DrawNGuessPacket = {
  id: string;
  starterPlayerId: string;
  entries: DrawNGuessEntry[];
};

export type DrawNGuessTurnSubmission = {
  playerId: string;
  status: "draft" | "submitted";
  updatedAt: number;
  submittedAt?: number;
  promptText?: string;
  drawing?: DrawNGuessDrawing;
  guessText?: string;
};

export type DrawNGuessActiveTurn = {
  turnIndex: number;
  mode: DrawNGuessTurnMode;
  startedAt: number;
  deadlineAt: number;
  graceDeadlineAt: number;
  submissions: Record<string, DrawNGuessTurnSubmission>;
};

export type DrawNGuessMatch = {
  gameKind: "drawnguess";
  roster: DrawNGuessPlayer[];
  settings: DrawNGuessSettings;
  phase: DrawNGuessPhase;
  turnIndex: number;
  activeTurn?: DrawNGuessActiveTurn;
  packets: DrawNGuessPacket[];
  revealPacketIndex: number;
  revealEntryIndex: number;
};

export type DrawNGuessAssignment =
  | {
      readonly mode: "custom-prompt";
      readonly packetId: string;
      readonly starterPlayerId: string;
    }
  | {
      readonly mode: "drawing";
      readonly packetId: string;
      readonly starterPlayerId: string;
      readonly promptText: string;
    }
  | {
      readonly mode: "guessing";
      readonly packetId: string;
      readonly starterPlayerId: string;
      readonly drawing: DrawNGuessDrawing;
    };

export type DrawNGuessPublicSnapshot = {
  readonly phase: DrawNGuessPhase;
  readonly settings: DrawNGuessSettings;
  readonly roster: readonly DrawNGuessPlayer[];
  readonly turnIndex: number;
  readonly turnMode: DrawNGuessTurnMode | null;
  readonly startedAt: number | null;
  readonly deadlineAt: number | null;
  readonly submittedPlayerIds: readonly string[];
  readonly revealPacketIndex: number;
  readonly revealEntryIndex: number;
  readonly revealPacket?: DrawNGuessPacket;
  readonly packets?: readonly DrawNGuessPacket[];
};

export type DrawNGuessPrivateSnapshot = {
  readonly assignment: DrawNGuessAssignment | null;
  readonly hasSubmitted: boolean;
  readonly ownSubmission: DrawNGuessTurnSubmission | null;
};

export type DrawNGuessSyncDto = {
  readonly public: DrawNGuessPublicSnapshot;
  readonly private: DrawNGuessPrivateSnapshot;
};
