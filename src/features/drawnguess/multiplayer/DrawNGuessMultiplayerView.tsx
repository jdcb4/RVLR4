import { type ReactNode, useEffect, useState } from "react";

import {
  PrimaryFooterButton,
  SecondaryFooterButton,
} from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import { IconArrowLeft, IconChevronRight, IconShare } from "@/components/icons";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Button } from "@/components/ui/button";
import type {
  DrawNGuessDrawing,
  DrawNGuessPacket,
  DrawNGuessSyncDto,
} from "@/domain/drawnguess/types";
import {
  MultiplayerEndGameActions,
  MultiplayerGameShell,
} from "@/features/multiplayer/MultiplayerGameShell";
import { type AvatarId, isAvatarId } from "@/multiplayer/avatarCatalog";

import { createBlankDrawing, renderDrawing } from "./drawingCanvas";
import { DrawNGuessDrawingPreview } from "./DrawNGuessDrawingPreview";
import { DrawNGuessWhiteboard } from "./DrawNGuessWhiteboard";

type EmitWithAck = (
  event: string,
  body?: unknown,
) => Promise<{ ok?: boolean; error?: string } | undefined>;

export function DrawNGuessMultiplayerView({
  payload,
  viewerPlayerId,
  isHost,
  replaySync,
  emitWithAck,
}: {
  readonly payload: DrawNGuessSyncDto;
  readonly viewerPlayerId: string;
  readonly isHost: boolean;
  readonly replaySync: {
    readonly offerActive: boolean;
    readonly acceptedIds: readonly string[];
    readonly cancelledByDisconnect: boolean;
  };
  readonly emitWithAck: EmitWithAck;
}) {
  const turnKey = `${payload.public.turnIndex}:${payload.public.turnMode}:${payload.public.deadlineAt ?? 0}`;
  const ownSubmission = payload.private.ownSubmission;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [promptDraft, setPromptDraft] = useState("");
  const [guessDraft, setGuessDraft] = useState("");
  const [drawingDraft, setDrawingDraft] = useState<DrawNGuessDrawing>(() => createBlankDrawing());
  const secondsLeft = useCountdownSeconds(payload.public.deadlineAt);
  const deadlineOpen = payload.public.deadlineAt ? Date.now() <= payload.public.deadlineAt : true;

  useEffect(() => {
    setEditing(false);
    setError("");
    setPromptDraft(ownSubmission?.promptText ?? "");
    setGuessDraft(ownSubmission?.guessText ?? "");
    setDrawingDraft(ownSubmission?.drawing ?? createBlankDrawing());
  }, [ownSubmission, turnKey]);

  const runAction = async (event: string, body?: unknown) => {
    setBusy(true);
    setError("");

    try {
      const ack = await emitWithAck(event, body);

      if (ack?.ok === false) {
        setError(ack.error ?? "That action did not work.");
      }
    } finally {
      setBusy(false);
    }
  };

  const assignment = payload.private.assignment;
  const submitted = payload.private.hasSubmitted && !editing;
  const footer = (
    <DrawNGuessFooter
      busy={busy}
      deadlineOpen={deadlineOpen}
      drawingDraft={drawingDraft}
      editing={editing}
      emitWithAck={emitWithAck}
      guessDraft={guessDraft}
      isHost={isHost}
      payload={payload}
      promptDraft={promptDraft}
      replaySync={replaySync}
      submitted={submitted}
      viewerPlayerId={viewerPlayerId}
      onAction={runAction}
      onEdit={() => setEditing(true)}
    />
  );

  return (
    <MultiplayerGameShell footer={footer} title="DrawNGuess">
      <DrawNGuessBody
        assignment={assignment}
        drawingDraft={drawingDraft}
        error={error}
        guessDraft={guessDraft}
        isHost={isHost}
        payload={payload}
        promptDraft={promptDraft}
        secondsLeft={secondsLeft}
        submitted={submitted}
        onAction={runAction}
        onDrawingChange={(next) => {
          setDrawingDraft(next);
          void runAction("drawnguess:updateDrawingDraft", { drawing: next });
        }}
        onGuessChange={(next) => {
          setGuessDraft(next);
          void runAction("drawnguess:updateGuessDraft", { text: next });
        }}
        onPromptChange={(next) => {
          setPromptDraft(next);
          void runAction("drawnguess:updatePromptDraft", { text: next });
        }}
      />
    </MultiplayerGameShell>
  );
}

function DrawNGuessBody({
  payload,
  assignment,
  submitted,
  secondsLeft,
  error,
  isHost,
  promptDraft,
  guessDraft,
  drawingDraft,
  onPromptChange,
  onGuessChange,
  onDrawingChange,
  onAction,
}: {
  readonly payload: DrawNGuessSyncDto;
  readonly assignment: DrawNGuessSyncDto["private"]["assignment"];
  readonly submitted: boolean;
  readonly secondsLeft: number | null;
  readonly error: string;
  readonly isHost: boolean;
  readonly promptDraft: string;
  readonly guessDraft: string;
  readonly drawingDraft: DrawNGuessDrawing;
  readonly onPromptChange: (next: string) => void;
  readonly onGuessChange: (next: string) => void;
  readonly onDrawingChange: (next: DrawNGuessDrawing) => void;
  readonly onAction: (event: string, body?: unknown) => Promise<void>;
}) {
  if (payload.public.phase === "complete") {
    return <DrawNGuessResultsScreen payload={payload} onAction={onAction} />;
  }

  if (payload.public.phase === "reveal") {
    return <DrawNGuessRevealScreen isHost={isHost} payload={payload} onAction={onAction} />;
  }

  if (!assignment) {
    return (
      <GamePanel title="Waiting for the next page" subtitle="The server is assigning packets.">
        <TurnTimer secondsLeft={secondsLeft} />
      </GamePanel>
    );
  }

  if (submitted) {
    return (
      <DrawNGuessWaitingPanel payload={payload} secondsLeft={secondsLeft} submission={payload.private.ownSubmission} />
    );
  }

  if (assignment.mode === "custom-prompt") {
    return (
      <GamePanel
        eyebrow={turnEyebrow(payload)}
        subtitle="Pick a word or short phrase to pass around the room."
        title="Pick your prompt"
      >
        <TurnTimer secondsLeft={secondsLeft} />
        <input
          autoFocus
          className="rounded-xl border border-input bg-background px-3 py-3 text-typ-body-relaxed outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          maxLength={42}
          placeholder="e.g. Robot chef"
          value={promptDraft}
          onChange={(event) => onPromptChange(event.target.value)}
        />
      </GamePanel>
    );
  }

  if (assignment.mode === "drawing") {
    return (
      <GamePanel eyebrow={turnEyebrow(payload)} subtitle="Draw the prompt without using text." title="Draw this">
        <TurnTimer secondsLeft={secondsLeft} />
        <p className="rounded-xl border border-border bg-background p-4 text-center text-typ-section-title font-bold">
          {assignment.promptText}
        </p>
        <DrawNGuessWhiteboard value={drawingDraft} onChange={onDrawingChange} />
        {error ? <p className="text-typ-ui text-destructive">{error}</p> : null}
      </GamePanel>
    );
  }

  return (
    <GamePanel
      eyebrow={turnEyebrow(payload)}
      subtitle="Type what you think the previous player drew."
      title="Guess the drawing"
    >
      <TurnTimer secondsLeft={secondsLeft} />
      <DrawNGuessDrawingPreview drawing={assignment.drawing} />
      <input
        autoFocus
        className="rounded-xl border border-input bg-background px-3 py-3 text-typ-body-relaxed outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        maxLength={42}
        placeholder="Your guess"
        value={guessDraft}
        onChange={(event) => onGuessChange(event.target.value)}
      />
      {error ? <p className="text-typ-ui text-destructive">{error}</p> : null}
    </GamePanel>
  );
}

function DrawNGuessFooter({
  payload,
  submitted,
  editing,
  busy,
  deadlineOpen,
  promptDraft,
  guessDraft,
  drawingDraft,
  isHost,
  replaySync,
  viewerPlayerId,
  emitWithAck,
  onAction,
  onEdit,
}: {
  readonly payload: DrawNGuessSyncDto;
  readonly submitted: boolean;
  readonly editing: boolean;
  readonly busy: boolean;
  readonly deadlineOpen: boolean;
  readonly promptDraft: string;
  readonly guessDraft: string;
  readonly drawingDraft: DrawNGuessDrawing;
  readonly isHost: boolean;
  readonly replaySync: {
    readonly offerActive: boolean;
    readonly acceptedIds: readonly string[];
    readonly cancelledByDisconnect: boolean;
  };
  readonly viewerPlayerId: string;
  readonly emitWithAck: EmitWithAck;
  readonly onAction: (event: string, body?: unknown) => Promise<void>;
  readonly onEdit: () => void;
}) {
  if (payload.public.phase === "complete") {
    return (
      <MultiplayerEndGameActions
        emitWithAck={emitWithAck}
        isHost={isHost}
        replaySync={replaySync}
        viewerPlayerId={viewerPlayerId}
      />
    );
  }

  if (payload.public.phase === "reveal") {
    return null;
  }

  if (submitted) {
    return (
      <DrawNGuessSubmittedFooter
        busy={busy}
        deadlineOpen={deadlineOpen}
        isHost={isHost}
        payload={payload}
        onAction={onAction}
        onEdit={onEdit}
      />
    );
  }

  if (!payload.private.assignment) {
    return null;
  }

  return (
    <DrawNGuessSubmitFooter
      busy={busy}
      drawingDraft={drawingDraft}
      editing={editing}
      guessDraft={guessDraft}
      payload={payload}
      promptDraft={promptDraft}
      onAction={onAction}
    />
  );
}

function DrawNGuessSubmittedFooter({
  payload,
  busy,
  deadlineOpen,
  isHost,
  onAction,
  onEdit,
}: {
  readonly payload: DrawNGuessSyncDto;
  readonly busy: boolean;
  readonly deadlineOpen: boolean;
  readonly isHost: boolean;
  readonly onAction: (event: string, body?: unknown) => Promise<void>;
  readonly onEdit: () => void;
}) {
  const allSubmitted = payload.public.submittedPlayerIds.length >= payload.public.roster.length;

  return (
    <div className="flex w-full flex-col gap-2">
      <SecondaryFooterButton disabled={!deadlineOpen} label="Edit response" onClick={onEdit} />
      {isHost && allSubmitted ? (
        <PrimaryFooterButton
          disabled={busy}
          label="Start next page"
          onClick={() => void onAction("drawnguess:advanceTurn")}
        />
      ) : null}
    </div>
  );
}

function DrawNGuessSubmitFooter({
  payload,
  busy,
  editing,
  promptDraft,
  drawingDraft,
  guessDraft,
  onAction,
}: {
  readonly payload: DrawNGuessSyncDto;
  readonly busy: boolean;
  readonly editing: boolean;
  readonly promptDraft: string;
  readonly drawingDraft: DrawNGuessDrawing;
  readonly guessDraft: string;
  readonly onAction: (event: string, body?: unknown) => Promise<void>;
}) {
  const assignment = payload.private.assignment;

  if (!assignment) {
    return null;
  }

  const configs = {
    "custom-prompt": {
      disabled: promptDraft.trim().length === 0,
      event: "drawnguess:submitPrompt",
      label: editing ? "Update prompt" : "Submit prompt",
      payload: { text: promptDraft },
    },
    drawing: {
      disabled: drawingDraft.format !== "strokes-v1",
      event: "drawnguess:submitDrawing",
      label: editing ? "Update drawing" : "Submit drawing",
      payload: { drawing: drawingDraft },
    },
    guessing: {
      disabled: guessDraft.trim().length === 0,
      event: "drawnguess:submitGuess",
      label: editing ? "Update guess" : "Submit guess",
      payload: { text: guessDraft },
    },
  } as const;
  const config = configs[assignment.mode];

  return (
    <PrimaryFooterButton
      disabled={busy || config.disabled}
      label={config.label}
      onClick={() => void onAction(config.event, config.payload)}
    />
  );
}

function DrawNGuessWaitingPanel({
  payload,
  secondsLeft,
  submission,
}: {
  readonly payload: DrawNGuessSyncDto;
  readonly secondsLeft: number | null;
  readonly submission: DrawNGuessSyncDto["private"]["ownSubmission"];
}) {
  const submitted = new Set(payload.public.submittedPlayerIds);
  const pending = payload.public.roster.filter((player) => !submitted.has(player.id));

  return (
    <GamePanel
      eyebrow={turnEyebrow(payload)}
      subtitle="You can edit until the timer expires."
      title="Response submitted"
    >
      <TurnTimer secondsLeft={secondsLeft} />
      {submission?.drawing ? <DrawNGuessDrawingPreview drawing={submission.drawing} /> : null}
      {submission?.guessText ? (
        <p className="rounded-xl border border-border bg-background p-4 text-center text-typ-section-title font-bold">
          {submission.guessText}
        </p>
      ) : null}
      {submission?.promptText ? (
        <p className="rounded-xl border border-border bg-background p-4 text-center text-typ-section-title font-bold">
          {submission.promptText}
        </p>
      ) : null}
      <div className="rounded-xl border border-border bg-background p-3">
        <p className="text-typ-ui font-semibold">Still working</p>
        <p className="mt-1 text-typ-ui-snug text-muted-foreground">
          {pending.length === 0 ? "Everyone has submitted." : pending.map((player) => player.name).join(", ")}
        </p>
      </div>
    </GamePanel>
  );
}

function DrawNGuessRevealScreen({
  payload,
  isHost,
  onAction,
}: {
  readonly payload: DrawNGuessSyncDto;
  readonly isHost: boolean;
  readonly onAction: (event: string, body?: unknown) => Promise<void>;
}) {
  const packet = payload.public.revealPacket;
  const roster = payload.public.roster;
  const owner = roster.find((player) => player.id === packet?.starterPlayerId) ?? roster[0];
  const ownerIndex = Math.max(0, roster.findIndex((player) => player.id === owner?.id));
  const entry = packet?.entries[payload.public.revealEntryIndex];

  if (!packet || !owner) {
    return <GamePanel title="Reveal" subtitle="Waiting for the first completed book." />;
  }

  const previousOwner = roster[(ownerIndex - 1 + roster.length) % roster.length];
  const nextOwner = roster[(ownerIndex + 1) % roster.length];

  return (
    <div className="space-y-4">
      <p className="text-typ-ui text-muted-foreground">
        Take turns presenting the responses to your prompt.
      </p>
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
        <BookButton
          disabled={!isHost || !previousOwner}
          label="Previous book"
          onClick={() => previousOwner && void onAction("drawnguess:openRevealPacket", { starterPlayerId: previousOwner.id })}
        >
          <IconArrowLeft className="size-5" />
        </BookButton>
        <div className="flex min-w-0 items-center gap-3">
          <PlayerAvatar avatarId={avatarIdFor(owner.avatarId)} className="size-12" name={owner.name} />
          <div className="min-w-0 text-center">
            <p className="truncate text-typ-card-title font-semibold">{owner.name}</p>
            <p className="text-typ-ui text-muted-foreground">Original prompt</p>
          </div>
        </div>
        <BookButton
          disabled={!isHost || !nextOwner}
          label="Next book"
          onClick={() => nextOwner && void onAction("drawnguess:openRevealPacket", { starterPlayerId: nextOwner.id })}
        >
          <IconChevronRight className="size-5" />
        </BookButton>
      </div>

      <GamePanel
        eyebrow={`Page ${payload.public.revealEntryIndex + 1} of ${packet.entries.length}`}
        title={entryTitle(entry)}
      >
        <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-border bg-background p-3">
          <RevealEntry entry={entry} packet={packet} />
        </div>
      </GamePanel>

      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={!isHost}
          type="button"
          variant="outline"
          onClick={() => void onAction("drawnguess:advanceReveal", { direction: "previous" })}
        >
          Previous page
        </Button>
        <Button
          disabled={!isHost}
          type="button"
          onClick={() => void onAction("drawnguess:advanceReveal", { direction: "next" })}
        >
          Next page
        </Button>
      </div>
      <Button
        className="w-full gap-2"
        type="button"
        variant="outline"
        onClick={() => downloadChainImage(packet, owner.name)}
      >
        <IconShare className="size-5" />
        Share chain
      </Button>
    </div>
  );
}

function DrawNGuessResultsScreen({
  payload,
  onAction,
}: {
  readonly payload: DrawNGuessSyncDto;
  readonly onAction: (event: string, body?: unknown) => Promise<void>;
}) {
  const packets = payload.public.packets ?? [];
  const roster = payload.public.roster;

  return (
    <GamePanel title="Final gallery" subtitle="Open any answer packet to present it again.">
      <div className="grid gap-2">
        {packets.map((packet) => {
          const owner = roster.find((player) => player.id === packet.starterPlayerId);

          return (
            <button
              className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition hover:border-semantic-primary-border hover:bg-semantic-accent-hover-wash"
              key={packet.id}
              type="button"
              onClick={() => void onAction("drawnguess:openRevealPacket", { starterPlayerId: packet.starterPlayerId })}
            >
              {owner ? (
                <PlayerAvatar avatarId={avatarIdFor(owner.avatarId)} className="size-11" name={owner.name} />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-typ-card-title font-semibold">
                  {owner?.name ?? "Player"}'s book
                </p>
                <p className="truncate text-typ-ui text-muted-foreground">
                  {originalPrompt(packet)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </GamePanel>
  );
}

function TurnTimer({ secondsLeft }: { readonly secondsLeft: number | null }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2">
      <span className="text-typ-ui font-medium text-muted-foreground">Time left</span>
      <span className="font-mono text-typ-section-title font-bold tabular-nums">
        {secondsLeft === null ? "--" : `${secondsLeft}s`}
      </span>
    </div>
  );
}

function RevealEntry({
  entry,
  packet,
}: {
  readonly entry: DrawNGuessPacket["entries"][number] | undefined;
  readonly packet: DrawNGuessPacket;
}) {
  if (!entry) {
    return <p className="text-typ-ui text-muted-foreground">No page selected.</p>;
  }

  if (entry.type === "drawing") {
    return <DrawNGuessDrawingPreview drawing={entry.drawing} />;
  }

  return (
    <p className="text-center text-typ-section-title font-bold">
      {entry.type === "prompt" && entry.playerId === "deck" ? originalPrompt(packet) : entry.text}
    </p>
  );
}

function BookButton({
  label,
  disabled,
  children,
  onClick,
}: {
  readonly label: string;
  readonly disabled: boolean;
  readonly children: ReactNode;
  readonly onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="rounded-xl border border-border p-2 text-foreground transition hover:bg-muted disabled:opacity-40"
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function useCountdownSeconds(deadlineAt: number | null) {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!deadlineAt) {
      setSeconds(null);

      return undefined;
    }

    const tick = () => setSeconds(Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)));

    tick();
    const interval = window.setInterval(tick, 250);

    return () => window.clearInterval(interval);
  }, [deadlineAt]);

  return seconds;
}

function turnEyebrow(payload: DrawNGuessSyncDto) {
  return `Turn ${payload.public.turnIndex + 1}`;
}

function entryTitle(entry: DrawNGuessPacket["entries"][number] | undefined) {
  if (!entry) {
    return "Page";
  }

  if (entry.type === "prompt") {
    return "Original prompt";
  }

  return entry.type === "drawing" ? "Drawing" : "Guess";
}

function originalPrompt(packet: DrawNGuessPacket) {
  const prompt = packet.entries.find((entry) => entry.type === "prompt");

  return prompt?.type === "prompt" ? prompt.text : "Original prompt";
}

function avatarIdFor(value: string | undefined): AvatarId {
  return isAvatarId(value) ? value : "bear";
}

function downloadChainImage(packet: DrawNGuessPacket, ownerName: string) {
  const width = 900;
  const rowHeight = 250;
  const padding = 48;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = padding * 2 + 80 + packet.entries.length * rowHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return;
  }

  ctx.fillStyle = "#f8f6f1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111827";
  ctx.font = "700 34px system-ui, sans-serif";
  ctx.fillText(`${ownerName}'s DrawNGuess chain`, padding, padding + 10);

  packet.entries.forEach((entry, index) => {
    const top = padding + 70 + index * rowHeight;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, padding, top, width - padding * 2, rowHeight - 22, 20);
    ctx.fill();
    ctx.strokeStyle = "#d6d3cb";
    ctx.stroke();
    ctx.fillStyle = "#6b7280";
    ctx.font = "600 20px system-ui, sans-serif";
    ctx.fillText(entryTitle(entry), padding + 28, top + 38);

    if (entry.type === "drawing") {
      drawEntryImage(ctx, entry.drawing, padding + 28, top + 56, width - padding * 2 - 56, 150);
    } else {
      ctx.fillStyle = "#111827";
      ctx.font = "700 32px system-ui, sans-serif";
      wrapText(ctx, entry.text, padding + 28, top + 100, width - padding * 2 - 56, 42);
    }
  });

  const link = document.createElement("a");
  link.download = `${ownerName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-drawnguess-chain.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function drawEntryImage(
  ctx: CanvasRenderingContext2D,
  drawing: DrawNGuessDrawing,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (drawing.format === "placeholder-v1") {
    ctx.fillStyle = "#6b7280";
    ctx.font = "700 28px system-ui, sans-serif";
    ctx.fillText(drawing.text, x, y + height / 2);

    return;
  }

  const preview = document.createElement("canvas");
  preview.width = 640;
  preview.height = 480;
  renderDrawing(preview, drawing);
  ctx.drawImage(preview, x, y, width, height);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let cursorY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;

    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, cursorY);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
