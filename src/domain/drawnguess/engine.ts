import {
  DRAWNGUESS_DEFAULT_DRAWING_DURATION_MS,
  DRAWNGUESS_DEFAULT_GRACE_MS,
  DRAWNGUESS_DEFAULT_GUESS_DURATION_MS,
  DRAWNGUESS_DEFAULT_WORD_PACK_ID,
  DRAWNGUESS_MAX_GUESS_LENGTH,
  DRAWNGUESS_MAX_PLAYERS,
  DRAWNGUESS_MAX_POINTS_PER_STROKE,
  DRAWNGUESS_MAX_PROMPT_LENGTH,
  DRAWNGUESS_MAX_STROKES,
  DRAWNGUESS_MIN_PLAYERS,
  type DrawNGuessActiveTurn,
  type DrawNGuessAssignment,
  type DrawNGuessDrawing,
  type DrawNGuessEntry,
  type DrawNGuessMatch,
  type DrawNGuessPacket,
  type DrawNGuessPlayer,
  type DrawNGuessPrivateSnapshot,
  type DrawNGuessPromptMode,
  type DrawNGuessPublicSnapshot,
  type DrawNGuessSettings,
  type DrawNGuessStroke,
  type DrawNGuessTurnMode,
  type DrawNGuessTurnSubmission,
  type DrawNGuessWordPrompt,
} from "./types";

export function createDefaultDrawNGuessSettings(
  overrides: Partial<DrawNGuessSettings> = {},
): DrawNGuessSettings {
  return {
    startingPromptMode: "predetermined",
    wordPackId: DRAWNGUESS_DEFAULT_WORD_PACK_ID,
    drawingDurationMs: DRAWNGUESS_DEFAULT_DRAWING_DURATION_MS,
    guessDurationMs: DRAWNGUESS_DEFAULT_GUESS_DURATION_MS,
    customPromptDurationMs: DRAWNGUESS_DEFAULT_GUESS_DURATION_MS,
    autoSubmitGraceMs: DRAWNGUESS_DEFAULT_GRACE_MS,
    ...overrides,
  };
}

export function getTurnMode(turnIndex: number): Exclude<DrawNGuessTurnMode, "custom-prompt"> {
  return turnIndex % 2 === 0 ? "drawing" : "guessing";
}

export function getPacketIndexForPlayer(
  playerIndex: number,
  turnIndex: number,
  playerCount: number,
): number {
  if (playerCount <= 0) {
    throw new Error("Player count is required.");
  }

  return (playerIndex - turnIndex + playerCount) % playerCount;
}

export function createDrawNGuessMatch({
  players,
  settings = createDefaultDrawNGuessSettings(),
  wordSource,
  rng = Math.random,
  now = Date.now(),
}: {
  readonly players: readonly DrawNGuessPlayer[];
  readonly settings?: DrawNGuessSettings;
  readonly wordSource: readonly DrawNGuessWordPrompt[];
  readonly rng?: () => number;
  readonly now?: number;
}): DrawNGuessMatch {
  validateRoster(players);
  const safeSettings = normalizeSettings(settings);
  const packets =
    safeSettings.startingPromptMode === "predetermined"
      ? createPredeterminedPackets(players, wordSource, rng, now)
      : createEmptyPackets(players);

  const activeTurn =
    safeSettings.startingPromptMode === "custom"
      ? createTurn(-1, "custom-prompt", safeSettings, now)
      : createTurn(0, "drawing", safeSettings, now);

  return {
    gameKind: "drawnguess",
    roster: players.map((player) => ({ ...player })),
    settings: safeSettings,
    phase: safeSettings.startingPromptMode === "custom" ? "custom-prompt" : "turn",
    turnIndex: activeTurn.turnIndex,
    activeTurn,
    packets,
    revealPacketIndex: 0,
    revealEntryIndex: 0,
  };
}

export function getAssignmentForPlayer(
  match: DrawNGuessMatch,
  playerId: string,
): DrawNGuessAssignment | null {
  const turn = match.activeTurn;

  if (!turn) {
    return null;
  }

  const playerIndex = match.roster.findIndex((player) => player.id === playerId);

  if (playerIndex < 0) {
    return null;
  }

  if (turn.mode === "custom-prompt") {
    const packet = packetAt(match, playerIndex);

    return {
      mode: "custom-prompt",
      packetId: packet.id,
      starterPlayerId: packet.starterPlayerId,
    };
  }

  const packet = packetAt(
    match,
    getPacketIndexForPlayer(playerIndex, turn.turnIndex, match.roster.length),
  );
  const latest = packet.entries[packet.entries.length - 1];

  if (turn.mode === "drawing") {
    const promptText = latest?.type === "prompt" || latest?.type === "guess" ? latest.text : "";

    return {
      mode: "drawing",
      packetId: packet.id,
      starterPlayerId: packet.starterPlayerId,
      promptText,
    };
  }

  if (latest?.type !== "drawing") {
    return null;
  }

  return {
    mode: "guessing",
    packetId: packet.id,
    starterPlayerId: packet.starterPlayerId,
    drawing: latest.drawing,
  };
}

export function updatePromptDraft(
  match: DrawNGuessMatch,
  playerId: string,
  text: string,
  now = Date.now(),
): DrawNGuessMatch {
  const trimmed = trimPrompt(text);

  return upsertSubmission(match, playerId, now, {
    mode: "custom-prompt",
    status: "draft",
    promptText: trimmed,
  });
}

export function submitPrompt(
  match: DrawNGuessMatch,
  playerId: string,
  text: string,
  now = Date.now(),
): DrawNGuessMatch {
  const trimmed = trimPrompt(text);

  if (!trimmed) {
    throw new Error("Prompt cannot be empty.");
  }

  return upsertSubmission(match, playerId, now, {
    mode: "custom-prompt",
    status: "submitted",
    promptText: trimmed,
  });
}

export function updateDrawingDraft(
  match: DrawNGuessMatch,
  playerId: string,
  drawing: DrawNGuessDrawing,
  now = Date.now(),
): DrawNGuessMatch {
  validateDrawing(drawing);

  return upsertSubmission(match, playerId, now, {
    mode: "drawing",
    status: "draft",
    drawing,
  });
}

export function submitDrawing(
  match: DrawNGuessMatch,
  playerId: string,
  drawing: DrawNGuessDrawing,
  now = Date.now(),
): DrawNGuessMatch {
  validateDrawing(drawing);

  return upsertSubmission(match, playerId, now, {
    mode: "drawing",
    status: "submitted",
    drawing,
  });
}

export function updateGuessDraft(
  match: DrawNGuessMatch,
  playerId: string,
  text: string,
  now = Date.now(),
): DrawNGuessMatch {
  const trimmed = trimGuess(text);

  return upsertSubmission(match, playerId, now, {
    mode: "guessing",
    status: "draft",
    guessText: trimmed,
  });
}

export function submitGuess(
  match: DrawNGuessMatch,
  playerId: string,
  text: string,
  now = Date.now(),
): DrawNGuessMatch {
  const trimmed = trimGuess(text);

  if (!trimmed) {
    throw new Error("Guess cannot be empty.");
  }

  return upsertSubmission(match, playerId, now, {
    mode: "guessing",
    status: "submitted",
    guessText: trimmed,
  });
}

export function isTurnComplete(match: DrawNGuessMatch): boolean {
  const turn = match.activeTurn;

  if (!turn) {
    return false;
  }

  return match.roster.every((player) => turn.submissions[player.id]?.status === "submitted");
}

export function advanceTurn(match: DrawNGuessMatch, now = Date.now()): DrawNGuessMatch {
  const turn = requireActiveTurn(match);

  if (!isTurnComplete(match) && now < turn.graceDeadlineAt) {
    throw new Error("Turn is still in progress.");
  }

  const next = cloneMatch(match);
  const nextTurn = requireActiveTurn(next);

  next.packets = lockTurnEntries(next, nextTurn, now);

  if (nextTurn.mode === "custom-prompt") {
    next.phase = "turn";
    next.turnIndex = 0;
    next.activeTurn = createTurn(0, "drawing", next.settings, now);

    return next;
  }

  const nextTurnIndex = nextTurn.turnIndex + 1;

  if (nextTurnIndex >= next.roster.length) {
    next.phase = "reveal";
    next.turnIndex = nextTurn.turnIndex;
    delete next.activeTurn;
    next.revealPacketIndex = 0;
    next.revealEntryIndex = 0;

    return next;
  }

  next.phase = "turn";
  next.turnIndex = nextTurnIndex;
  next.activeTurn = createTurn(nextTurnIndex, getTurnMode(nextTurnIndex), next.settings, now);

  return next;
}

export function advanceReveal(
  match: DrawNGuessMatch,
  direction: "next" | "previous" = "next",
): DrawNGuessMatch {
  if (match.phase !== "reveal" && match.phase !== "complete") {
    throw new Error("Reveal is not available yet.");
  }

  const next = cloneMatch(match);
  const packet = packetAt(next, next.revealPacketIndex);
  const lastEntryIndex = Math.max(0, packet.entries.length - 1);

  if (direction === "previous") {
    if (next.revealEntryIndex > 0) {
      next.revealEntryIndex -= 1;
    } else if (next.revealPacketIndex > 0) {
      next.revealPacketIndex -= 1;
      next.revealEntryIndex = packetAt(next, next.revealPacketIndex).entries.length - 1;
    }

    if (next.phase === "complete") {
      next.phase = "reveal";
    }

    return next;
  }

  if (next.revealEntryIndex < lastEntryIndex) {
    next.revealEntryIndex += 1;

    return next;
  }

  if (next.revealPacketIndex < next.packets.length - 1) {
    next.revealPacketIndex += 1;
    next.revealEntryIndex = 0;

    return next;
  }

  next.phase = "complete";

  return next;
}

export function openRevealPacket(match: DrawNGuessMatch, starterPlayerId: string): DrawNGuessMatch {
  if (match.phase !== "reveal" && match.phase !== "complete") {
    throw new Error("Reveal is not available yet.");
  }

  const packetIndex = match.packets.findIndex(
    (packet) => packet.starterPlayerId === starterPlayerId,
  );

  if (packetIndex < 0) {
    throw new Error("Unknown packet.");
  }

  const next = cloneMatch(match);
  next.phase = "reveal";
  next.revealPacketIndex = packetIndex;
  next.revealEntryIndex = 0;

  return next;
}

export function getPublicMatchSnapshot(match: DrawNGuessMatch): DrawNGuessPublicSnapshot {
  const turn = match.activeTurn;
  const revealPacket =
    match.phase === "reveal" || match.phase === "complete"
      ? packetAt(match, match.revealPacketIndex)
      : undefined;

  return {
    phase: match.phase,
    settings: match.settings,
    roster: match.roster,
    turnIndex: match.turnIndex,
    turnMode: turn?.mode ?? null,
    startedAt: turn?.startedAt ?? null,
    deadlineAt: turn?.deadlineAt ?? null,
    submittedPlayerIds: turn
      ? match.roster
          .filter((player) => turn.submissions[player.id]?.status === "submitted")
          .map((player) => player.id)
      : [],
    revealPacketIndex: match.revealPacketIndex,
    revealEntryIndex: match.revealEntryIndex,
    ...(revealPacket ? { revealPacket } : {}),
    ...(match.phase === "complete" ? { packets: match.packets } : {}),
  };
}

export function getPrivatePlayerSnapshot(
  match: DrawNGuessMatch,
  playerId: string,
): DrawNGuessPrivateSnapshot {
  const turn = match.activeTurn;
  const ownSubmission = turn?.submissions[playerId] ?? null;

  return {
    assignment: getAssignmentForPlayer(match, playerId),
    hasSubmitted: ownSubmission?.status === "submitted",
    ownSubmission,
  };
}

function upsertSubmission(
  match: DrawNGuessMatch,
  playerId: string,
  now: number,
  patch: {
    readonly mode: DrawNGuessTurnMode;
    readonly status: "draft" | "submitted";
    readonly promptText?: string;
    readonly drawing?: DrawNGuessDrawing;
    readonly guessText?: string;
  },
): DrawNGuessMatch {
  const turn = requireActiveTurn(match);
  assertSubmissionAllowed(match, turn, playerId, patch.mode, now);

  const next = cloneMatch(match);
  const nextTurn = requireActiveTurn(next);
  const previous = nextTurn.submissions[playerId];

  nextTurn.submissions[playerId] = buildTurnSubmission(playerId, now, patch, previous);

  return next;
}

function assertSubmissionAllowed(
  match: DrawNGuessMatch,
  turn: DrawNGuessActiveTurn,
  playerId: string,
  mode: DrawNGuessTurnMode,
  now: number,
) {
  if (turn.mode !== mode) {
    throw new Error("That submission does not match the active turn.");
  }

  if (now > turn.graceDeadlineAt) {
    throw new Error("Turn is locked.");
  }

  if (!match.roster.some((player) => player.id === playerId)) {
    throw new Error("Player is not in this match.");
  }
}

function buildTurnSubmission(
  playerId: string,
  now: number,
  patch: {
    readonly status: "draft" | "submitted";
    readonly promptText?: string;
    readonly drawing?: DrawNGuessDrawing;
    readonly guessText?: string;
  },
  previous: DrawNGuessTurnSubmission | undefined,
): DrawNGuessTurnSubmission {
  const next: DrawNGuessTurnSubmission = {
    playerId,
    status: patch.status,
    updatedAt: now,
  };

  if (patch.status === "submitted") {
    next.submittedAt = now;
  }

  copySubmissionText(next, "promptText", patch.promptText ?? previous?.promptText);
  copySubmissionDrawing(next, patch.drawing ?? previous?.drawing);
  copySubmissionText(next, "guessText", patch.guessText ?? previous?.guessText);

  return next;
}

function copySubmissionText(
  submission: DrawNGuessTurnSubmission,
  key: "promptText" | "guessText",
  value: string | undefined,
) {
  if (value !== undefined) {
    submission[key] = value;
  }
}

function copySubmissionDrawing(
  submission: DrawNGuessTurnSubmission,
  value: DrawNGuessDrawing | undefined,
) {
  if (value !== undefined) {
    submission.drawing = value;
  }
}

function lockTurnEntries(
  match: DrawNGuessMatch,
  turn: DrawNGuessActiveTurn,
  now: number,
): DrawNGuessPacket[] {
  const packets = match.packets.map((packet) => ({
    ...packet,
    entries: [...packet.entries],
  }));

  match.roster.forEach((player, playerIndex) => {
    const packetIndex =
      turn.mode === "custom-prompt"
        ? playerIndex
        : getPacketIndexForPlayer(playerIndex, turn.turnIndex, match.roster.length);
    const packet = packets[packetIndex];

    if (!packet) {
      throw new Error("Packet assignment failed.");
    }

    packet.entries.push(entryFromSubmission(turn, player.id, now));
  });

  return packets;
}

function entryFromSubmission(
  turn: DrawNGuessActiveTurn,
  playerId: string,
  now: number,
): DrawNGuessEntry {
  const submission = turn.submissions[playerId];

  if (turn.mode === "custom-prompt") {
    const promptText = submission?.promptText?.trim();

    if (submission && promptText) {
      return {
        type: "prompt",
        playerId,
        text: promptText,
        createdAt: submission.updatedAt,
      };
    }

    return {
      type: "prompt",
      playerId,
      text: "[no response submitted]",
      createdAt: now,
      placeholder: true,
    };
  }

  if (turn.mode === "drawing") {
    if (submission?.drawing) {
      return {
        type: "drawing",
        playerId,
        drawing: submission.drawing,
        createdAt: submission.updatedAt,
      };
    }

    return {
      type: "drawing",
      playerId,
      drawing: createNoResponseDrawing(),
      createdAt: now,
      placeholder: true,
    };
  }

  const guessText = submission?.guessText?.trim();

  if (submission && guessText) {
    return {
      type: "guess",
      playerId,
      text: guessText,
      createdAt: submission.updatedAt,
    };
  }

  return {
    type: "guess",
    playerId,
    text: "[no response submitted]",
    createdAt: now,
    placeholder: true,
  };
}

export function createNoResponseDrawing(): DrawNGuessDrawing {
  return {
    format: "placeholder-v1",
    text: "No response submitted",
  };
}

function createTurn(
  turnIndex: number,
  mode: DrawNGuessTurnMode,
  settings: DrawNGuessSettings,
  now: number,
): DrawNGuessActiveTurn {
  const duration =
    mode === "drawing"
      ? settings.drawingDurationMs
      : mode === "guessing"
        ? settings.guessDurationMs
        : settings.customPromptDurationMs;
  const deadlineAt = now + duration;

  return {
    turnIndex,
    mode,
    startedAt: now,
    deadlineAt,
    graceDeadlineAt: deadlineAt + settings.autoSubmitGraceMs,
    submissions: {},
  };
}

function createPredeterminedPackets(
  players: readonly DrawNGuessPlayer[],
  wordSource: readonly DrawNGuessWordPrompt[],
  rng: () => number,
  now: number,
): DrawNGuessPacket[] {
  const words = pickUniquePrompts(wordSource, players.length, rng);

  return players.map((player, index) => {
    const word = words[index];

    if (!word) {
      throw new Error("Not enough prompts for the player count.");
    }

    return {
      id: `packet-${index + 1}`,
      starterPlayerId: player.id,
      entries: [
        {
          type: "prompt",
          playerId: "deck",
          text: word.phrase,
          createdAt: now,
        },
      ],
    };
  });
}

function createEmptyPackets(players: readonly DrawNGuessPlayer[]): DrawNGuessPacket[] {
  return players.map((player, index) => ({
    id: `packet-${index + 1}`,
    starterPlayerId: player.id,
    entries: [],
  }));
}

function pickUniquePrompts(
  wordSource: readonly DrawNGuessWordPrompt[],
  count: number,
  rng: () => number,
): DrawNGuessWordPrompt[] {
  const byPhrase = new Map<string, DrawNGuessWordPrompt>();

  for (const word of wordSource) {
    const phrase = word.phrase.trim();

    if (phrase) {
      byPhrase.set(phrase.toLocaleLowerCase(), { ...word, phrase });
    }
  }

  const words = [...byPhrase.values()];

  if (words.length < count) {
    throw new Error("Not enough prompts for the player count.");
  }

  for (let index = words.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const current = words[index];
    const swap = words[swapIndex];

    if (!current || !swap) {
      continue;
    }

    words[index] = swap;
    words[swapIndex] = current;
  }

  return words.slice(0, count);
}

function validateRoster(players: readonly DrawNGuessPlayer[]) {
  if (players.length < DRAWNGUESS_MIN_PLAYERS) {
    throw new Error(`DrawNGuess needs at least ${DRAWNGUESS_MIN_PLAYERS} players.`);
  }

  if (players.length > DRAWNGUESS_MAX_PLAYERS) {
    throw new Error(`DrawNGuess supports at most ${DRAWNGUESS_MAX_PLAYERS} players.`);
  }

  const ids = new Set<string>();

  for (const player of players) {
    if (!player.id) {
      throw new Error("Every player needs an id.");
    }

    if (ids.has(player.id)) {
      throw new Error("Player ids must be unique.");
    }

    ids.add(player.id);
  }
}

function normalizeSettings(settings: DrawNGuessSettings): DrawNGuessSettings {
  return {
    startingPromptMode: normalizePromptMode(settings.startingPromptMode),
    wordPackId: settings.wordPackId.trim() || DRAWNGUESS_DEFAULT_WORD_PACK_ID,
    drawingDurationMs: clampDuration(settings.drawingDurationMs),
    guessDurationMs: clampDuration(settings.guessDurationMs),
    customPromptDurationMs: clampDuration(settings.customPromptDurationMs),
    autoSubmitGraceMs: Math.min(Math.max(Math.trunc(settings.autoSubmitGraceMs), 500), 5_000),
  };
}

function normalizePromptMode(mode: DrawNGuessPromptMode): DrawNGuessPromptMode {
  return mode === "custom" ? "custom" : "predetermined";
}

function clampDuration(value: number): number {
  return Math.min(Math.max(Math.trunc(value), 10_000), 180_000);
}

function trimPrompt(text: string): string {
  return text.trim().slice(0, DRAWNGUESS_MAX_PROMPT_LENGTH);
}

function trimGuess(text: string): string {
  return text.trim().slice(0, DRAWNGUESS_MAX_GUESS_LENGTH);
}

function validateDrawing(drawing: DrawNGuessDrawing) {
  if (drawing.format === "placeholder-v1") {
    throw new Error("Players cannot submit placeholder drawings.");
  }

  validateDrawingDimensions(drawing.width, drawing.height);

  if (drawing.strokes.length > DRAWNGUESS_MAX_STROKES) {
    throw new Error("Drawing has too many strokes.");
  }

  for (const stroke of drawing.strokes) {
    validateStroke(stroke);
  }
}

function validateDrawingDimensions(width: number, height: number) {
  if (width <= 0 || height <= 0 || width > 4096 || height > 4096) {
    throw new Error("Drawing dimensions are invalid.");
  }
}

function validateStroke(stroke: DrawNGuessStroke) {
  if (stroke.points.length > DRAWNGUESS_MAX_POINTS_PER_STROKE) {
    throw new Error("Drawing stroke has too many points.");
  }

  if (stroke.size < 1 || stroke.size > 64) {
    throw new Error("Brush size is invalid.");
  }

  for (const point of stroke.points) {
    validatePoint(point.x, point.y);
  }
}

function validatePoint(x: number, y: number) {
  if (x < 0 || x > 1 || y < 0 || y > 1) {
    throw new Error("Drawing points must be normalized.");
  }
}

function requireActiveTurn(match: DrawNGuessMatch): DrawNGuessActiveTurn {
  if (!match.activeTurn) {
    throw new Error("No turn is active.");
  }

  return match.activeTurn;
}

function packetAt(match: DrawNGuessMatch, index: number): DrawNGuessPacket {
  const packet = match.packets[index];

  if (!packet) {
    throw new Error("Packet does not exist.");
  }

  return packet;
}

function cloneMatch(match: DrawNGuessMatch): DrawNGuessMatch {
  return structuredClone(match) as DrawNGuessMatch;
}
