import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from "react";

import { AccessibleCountdownValue } from "@/components/game/AccessibleCountdownValue";
import { PrimaryFooterButton, SecondaryFooterButton } from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import { ReadyNextStepsCard } from "@/components/game/ReadyNextStepsCard";
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
import { playGameSoundEffect } from "@/services/gameSoundEffects";

import { createBlankDrawing, renderDrawing } from "./drawingCanvas";
import { DrawNGuessDrawingPreview } from "./DrawNGuessDrawingPreview";
import { DrawNGuessWhiteboard } from "./DrawNGuessWhiteboard";

type EmitWithAck = (
  event: string,
  body?: unknown,
) => Promise<{ ok?: boolean; error?: string } | undefined>;

type DrawNGuessViewProps = {
  readonly payload: DrawNGuessSyncDto;
  readonly viewerPlayerId: string;
  readonly isHost: boolean;
  readonly replaySync: {
    readonly offerActive: boolean;
    readonly acceptedIds: readonly string[];
    readonly cancelledByDisconnect: boolean;
  };
  readonly emitWithAck: EmitWithAck;
};

export function DrawNGuessMultiplayerView(props: DrawNGuessViewProps) {
  return (
    <DrawNGuessTurnView
      key={`${props.viewerPlayerId}:${drawNGuessTurnKey(props.payload)}`}
      {...props}
    />
  );
}

function DrawNGuessTurnView({
  payload,
  viewerPlayerId,
  isHost,
  replaySync,
  emitWithAck,
}: DrawNGuessViewProps) {
  const turnKey = drawNGuessTurnKey(payload);
  const ownSubmission = payload.private.ownSubmission;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [promptDraft, setPromptDraft] = useState(ownSubmission?.promptText ?? "");
  const [guessDraft, setGuessDraft] = useState(ownSubmission?.guessText ?? "");
  const [drawingDraft, setDrawingDraft] = useState<DrawNGuessDrawing>(
    () => ownSubmission?.drawing ?? createBlankDrawing(),
  );
  const latestAction = useRef(0);
  const [localGalleryOpen, setLocalGalleryOpen] = useState(false);
  const secondsLeft = useCountdownSeconds(payload.public.deadlineAt);
  const deadlineOpen = payload.public.deadlineAt ? Date.now() <= payload.public.deadlineAt : true;

  useDrawNGuessWarningSound(payload);

  // The keyed turn view initializes from the server on entry/recovery. During
  // that turn this device owns its draft; peer broadcasts and delayed echoes
  // must not replace text or close an edit in progress.
  useEffect(
    () => () => {
      latestAction.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (payload.public.phase !== "reveal") {
      setLocalGalleryOpen(false);
    }
  }, [payload.public.phase]);

  const runAction = async (event: string, body: Record<string, unknown>, submit = false) => {
    const actionId = ++latestAction.current;
    if (submit) setBusy(true);
    setError("");

    try {
      const ack = await emitWithAck(event, { ...body, turnKey });
      if (actionId !== latestAction.current) return;

      if (ack?.ok !== true) {
        setError(ack?.error ?? "That action did not work.");
      } else if (submit) {
        setEditing(false);
      }
    } catch {
      if (actionId === latestAction.current)
        setError(
          "Your response could not be saved. Check the connection and try submitting again.",
        );
    } finally {
      if (submit) setBusy(false);
    }
  };

  const assignment = payload.private.assignment;
  const submitted = payload.private.hasSubmitted && !editing;
  const submitCurrentResponse = async () => {
    if (!assignment || submitted || busy || !deadlineOpen) {
      return;
    }

    const config = getDrawNGuessSubmitConfig({
      mode: assignment.mode,
      editing,
      promptDraft,
      drawingDraft,
      guessDraft,
    });

    if (!config.disabled) {
      await runAction(config.event, config.payload, true);
    }
  };
  const handleTextSubmitKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing || busy || !deadlineOpen) {
      return;
    }

    event.preventDefault();
    void submitCurrentResponse();
  };
  const footer = (
    <DrawNGuessFooter
      busy={busy}
      deadlineOpen={deadlineOpen}
      drawingDraft={drawingDraft}
      editing={editing}
      emitWithAck={emitWithAck}
      guessDraft={guessDraft}
      localGalleryOpen={localGalleryOpen}
      isHost={isHost}
      payload={payload}
      promptDraft={promptDraft}
      replaySync={replaySync}
      submitted={submitted}
      viewerPlayerId={viewerPlayerId}
      onEdit={() => setEditing(true)}
      onGoToGallery={() => setLocalGalleryOpen(true)}
      onSubmit={submitCurrentResponse}
    />
  );

  return (
    <MultiplayerGameShell footer={footer} title="DrawNGuess">
      <DrawNGuessBody
        disabled={busy || !deadlineOpen}
        assignment={assignment}
        drawingDraft={drawingDraft}
        error={error}
        guessDraft={guessDraft}
        localGalleryOpen={localGalleryOpen}
        payload={payload}
        promptDraft={promptDraft}
        secondsLeft={secondsLeft}
        submitted={submitted}
        viewerPlayerId={viewerPlayerId}
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
        onTextSubmitKeyDown={handleTextSubmitKeyDown}
      />
    </MultiplayerGameShell>
  );
}

function DrawNGuessBody({
  disabled,
  payload,
  assignment,
  submitted,
  secondsLeft,
  error,
  localGalleryOpen,
  promptDraft,
  guessDraft,
  drawingDraft,
  viewerPlayerId,
  onPromptChange,
  onGuessChange,
  onDrawingChange,
  onTextSubmitKeyDown,
}: {
  readonly disabled: boolean;
  readonly payload: DrawNGuessSyncDto;
  readonly assignment: DrawNGuessSyncDto["private"]["assignment"];
  readonly submitted: boolean;
  readonly secondsLeft: number | null;
  readonly error: string;
  readonly localGalleryOpen: boolean;
  readonly promptDraft: string;
  readonly guessDraft: string;
  readonly drawingDraft: DrawNGuessDrawing;
  readonly viewerPlayerId: string;
  readonly onPromptChange: (next: string) => void;
  readonly onGuessChange: (next: string) => void;
  readonly onDrawingChange: (next: DrawNGuessDrawing) => void;
  readonly onTextSubmitKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
}) {
  if (payload.public.phase === "complete" || localGalleryOpen) {
    return <DrawNGuessResultsScreen payload={payload} />;
  }

  if (payload.public.phase === "reveal") {
    return <DrawNGuessPresentationScreen payload={payload} viewerPlayerId={viewerPlayerId} />;
  }

  if (!assignment) {
    return (
      <GamePanel title="Waiting for the next page" subtitle="The server is assigning packets.">
        <TurnTimer countdownKey={drawNGuessTurnKey(payload)} secondsLeft={secondsLeft} />
      </GamePanel>
    );
  }

  if (submitted) {
    return (
      <DrawNGuessWaitingPanel
        payload={payload}
        secondsLeft={secondsLeft}
        submission={payload.private.ownSubmission}
      />
    );
  }

  if (assignment.mode === "custom-prompt") {
    return (
      <GamePanel
        eyebrow={turnEyebrow(payload)}
        subtitle="Pick a word or short phrase to pass around the room."
        title="Pick your prompt"
      >
        <TurnTimer countdownKey={drawNGuessTurnKey(payload)} secondsLeft={secondsLeft} />
        <input
          disabled={disabled}
          autoCapitalize="sentences"
          autoComplete="off"
          autoFocus
          className="rounded-xl border border-input bg-background px-3 py-3 text-typ-body-relaxed outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          enterKeyHint="send"
          inputMode="text"
          maxLength={42}
          placeholder="e.g. Robot chef"
          spellCheck={false}
          type="text"
          value={promptDraft}
          onChange={(event) => onPromptChange(event.target.value)}
          onKeyDown={onTextSubmitKeyDown}
        />
        {error ? (
          <p role="alert" className="text-typ-ui text-destructive">
            {error}
          </p>
        ) : null}
      </GamePanel>
    );
  }

  if (assignment.mode === "drawing") {
    return (
      <GamePanel
        eyebrow={turnEyebrow(payload)}
        subtitle="Draw the prompt without using text."
        title="Draw this"
      >
        <TurnTimer countdownKey={drawNGuessTurnKey(payload)} secondsLeft={secondsLeft} />
        <p className="rounded-xl border border-border bg-background p-4 text-center text-typ-section-title font-bold">
          {assignment.promptText}
        </p>
        <DrawNGuessWhiteboard disabled={disabled} value={drawingDraft} onChange={onDrawingChange} />
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
      <TurnTimer countdownKey={drawNGuessTurnKey(payload)} secondsLeft={secondsLeft} />
      <DrawNGuessDrawingPreview drawing={assignment.drawing} />
      <input
        disabled={disabled}
        autoCapitalize="sentences"
        autoComplete="off"
        autoFocus
        className="rounded-xl border border-input bg-background px-3 py-3 text-typ-body-relaxed outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        enterKeyHint="send"
        inputMode="text"
        maxLength={42}
        placeholder="Your guess"
        spellCheck={false}
        type="text"
        value={guessDraft}
        onChange={(event) => onGuessChange(event.target.value)}
        onKeyDown={onTextSubmitKeyDown}
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
  localGalleryOpen,
  replaySync,
  viewerPlayerId,
  emitWithAck,
  onSubmit,
  onEdit,
  onGoToGallery,
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
  readonly localGalleryOpen: boolean;
  readonly replaySync: {
    readonly offerActive: boolean;
    readonly acceptedIds: readonly string[];
    readonly cancelledByDisconnect: boolean;
  };
  readonly viewerPlayerId: string;
  readonly emitWithAck: EmitWithAck;
  readonly onSubmit: () => Promise<void>;
  readonly onEdit: () => void;
  readonly onGoToGallery: () => void;
}) {
  if (payload.public.phase === "complete" || localGalleryOpen) {
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
    return <PrimaryFooterButton label="Go to Final Gallery" onClick={onGoToGallery} />;
  }

  if (submitted) {
    return <DrawNGuessSubmittedFooter deadlineOpen={deadlineOpen} onEdit={onEdit} />;
  }

  if (!payload.private.assignment) {
    return null;
  }

  return (
    <DrawNGuessSubmitFooter
      busy={busy}
      deadlineOpen={deadlineOpen}
      drawingDraft={drawingDraft}
      editing={editing}
      guessDraft={guessDraft}
      payload={payload}
      promptDraft={promptDraft}
      onSubmit={onSubmit}
    />
  );
}

function DrawNGuessSubmittedFooter({
  deadlineOpen,
  onEdit,
}: {
  readonly deadlineOpen: boolean;
  readonly onEdit: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <SecondaryFooterButton disabled={!deadlineOpen} label="Edit response" onClick={onEdit} />
    </div>
  );
}

function DrawNGuessSubmitFooter({
  payload,
  busy,
  deadlineOpen,
  editing,
  promptDraft,
  drawingDraft,
  guessDraft,
  onSubmit,
}: {
  readonly payload: DrawNGuessSyncDto;
  readonly busy: boolean;
  readonly deadlineOpen: boolean;
  readonly editing: boolean;
  readonly promptDraft: string;
  readonly drawingDraft: DrawNGuessDrawing;
  readonly guessDraft: string;
  readonly onSubmit: () => Promise<void>;
}) {
  const assignment = payload.private.assignment;

  if (!assignment) {
    return null;
  }

  const config = getDrawNGuessSubmitConfig({
    mode: assignment.mode,
    editing,
    promptDraft,
    drawingDraft,
    guessDraft,
  });

  return (
    <PrimaryFooterButton
      disabled={busy || !deadlineOpen || config.disabled}
      label={config.label}
      onClick={() => void onSubmit()}
    />
  );
}

function getDrawNGuessSubmitConfig({
  mode,
  editing,
  promptDraft,
  drawingDraft,
  guessDraft,
}: {
  readonly mode: NonNullable<DrawNGuessSyncDto["private"]["assignment"]>["mode"];
  readonly editing: boolean;
  readonly promptDraft: string;
  readonly drawingDraft: DrawNGuessDrawing;
  readonly guessDraft: string;
}) {
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

  return configs[mode];
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
      <TurnTimer countdownKey={drawNGuessTurnKey(payload)} secondsLeft={secondsLeft} />
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
          {pending.length === 0
            ? "Everyone has submitted."
            : pending.map((player) => player.name).join(", ")}
        </p>
      </div>
    </GamePanel>
  );
}

function DrawNGuessPresentationScreen({
  payload,
  viewerPlayerId,
}: {
  readonly payload: DrawNGuessSyncDto;
  readonly viewerPlayerId: string;
}) {
  const packet = findPacketForPlayer(payload, viewerPlayerId);
  const owner = payload.public.roster.find((player) => player.id === packet?.starterPlayerId);

  if (!packet || !owner) {
    return <GamePanel title="Presentation" subtitle="Waiting for your completed book." />;
  }

  return (
    <div className="space-y-4">
      <DrawNGuessBookDisplay owner={owner} packet={packet} />
      <ReadyNextStepsCard primaryText="Take turns presenting your Books to the other players. Once you've finished click through to the final gallery where you can view and share all of the books." />
    </div>
  );
}

function DrawNGuessResultsScreen({ payload }: { readonly payload: DrawNGuessSyncDto }) {
  const packets = payload.public.packets ?? [];
  const roster = payload.public.roster;
  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(null);
  const selectedPacket = packets.find((packet) => packet.id === selectedPacketId) ?? null;
  const selectedOwner = roster.find((player) => player.id === selectedPacket?.starterPlayerId);

  return (
    <div className="space-y-4">
      <GamePanel title="Final gallery" subtitle="Open any answer packet to present it again.">
        <div className="grid gap-2">
          {packets.map((packet) => (
            <GalleryPacketButton
              key={packet.id}
              packet={packet}
              roster={roster}
              selected={packet.id === selectedPacket?.id}
              onClick={() => setSelectedPacketId(packet.id)}
            />
          ))}
        </div>
      </GamePanel>

      {selectedPacket && selectedOwner ? (
        <div className="space-y-3">
          <DrawNGuessBookDisplay owner={selectedOwner} packet={selectedPacket} />
          <Button
            className="w-full gap-2"
            type="button"
            variant="outline"
            onClick={() => downloadChainImage(selectedPacket, selectedOwner?.name ?? "player")}
          >
            <IconShare className="size-5" />
            Share chain
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function DrawNGuessBookDisplay({
  packet,
  owner,
}: {
  readonly packet: DrawNGuessPacket;
  readonly owner: DrawNGuessSyncDto["public"]["roster"][number];
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = packet.entries.length;
  const entry = packet.entries[pageIndex];

  useEffect(() => {
    setPageIndex(0);
  }, [packet.id]);

  return (
    <div className="space-y-3">
      <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
        <PlayerAvatar
          avatarId={avatarIdFor(owner.avatarId)}
          className="size-12"
          name={owner.name}
        />
        <div className="min-w-0">
          <p className="truncate text-typ-card-title font-semibold">{owner.name}'s book</p>
          <p className="truncate text-typ-ui text-muted-foreground">{originalPrompt(packet)}</p>
        </div>
      </div>

      <GamePanel eyebrow={`Page ${pageIndex + 1} of ${pageCount}`} title={entryTitle(entry)}>
        <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-border bg-background p-3">
          <RevealEntry entry={entry} packet={packet} />
        </div>
      </GamePanel>

      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={pageIndex <= 0}
          type="button"
          variant="outline"
          onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
        >
          <IconArrowLeft className="mr-2 size-4" />
          Previous page
        </Button>
        <Button
          disabled={pageIndex >= pageCount - 1}
          type="button"
          onClick={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))}
        >
          Next page
          <IconChevronRight className="ml-2 size-4" />
        </Button>
      </div>
    </div>
  );
}

function GalleryPacketButton({
  packet,
  roster,
  selected,
  onClick,
}: {
  readonly packet: DrawNGuessPacket;
  readonly roster: DrawNGuessSyncDto["public"]["roster"];
  readonly selected: boolean;
  readonly onClick: () => void;
}) {
  const owner = roster.find((player) => player.id === packet.starterPlayerId);

  return (
    <button
      className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition hover:border-semantic-primary-border hover:bg-semantic-accent-hover-wash aria-pressed:border-primary aria-pressed:bg-semantic-primary-soft-bg"
      aria-pressed={selected}
      type="button"
      onClick={onClick}
    >
      {owner ? (
        <PlayerAvatar
          avatarId={avatarIdFor(owner.avatarId)}
          className="size-11"
          name={owner.name}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-typ-card-title font-semibold">
          {owner?.name ?? "Player"}'s book
        </p>
        <p className="truncate text-typ-ui text-muted-foreground">{originalPrompt(packet)}</p>
      </div>
    </button>
  );
}

function TurnTimer({
  secondsLeft,
  countdownKey,
}: {
  readonly secondsLeft: number | null;
  readonly countdownKey: string;
}) {
  const formattedValue = secondsLeft === null ? "--" : `${secondsLeft}s`;

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2">
      <span className="text-typ-ui font-medium text-muted-foreground">Time left</span>
      <span className="font-mono text-typ-section-title font-bold tabular-nums">
        <AccessibleCountdownValue
          countdownKey={countdownKey}
          formattedValue={formattedValue}
          secondsLeft={secondsLeft}
        />
      </span>
    </div>
  );
}

function drawNGuessTurnKey(payload: DrawNGuessSyncDto): string {
  return `${payload.public.turnIndex}:${payload.public.turnMode ?? "waiting"}:${payload.public.deadlineAt ?? 0}`;
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

function useDrawNGuessWarningSound(payload: DrawNGuessSyncDto) {
  const warnedForTurn = useRef<string | null>(null);
  const { phase, turnMode, startedAt, deadlineAt } = payload.public;

  useEffect(() => {
    if (
      phase !== "turn" ||
      (turnMode !== "drawing" && turnMode !== "guessing") ||
      !startedAt ||
      !deadlineAt
    ) {
      warnedForTurn.current = null;

      return undefined;
    }

    const warningKey = `${turnMode}:${startedAt}:${deadlineAt}`;
    const tick = () => {
      const secondsLeft = Math.ceil((deadlineAt - Date.now()) / 1000);

      if (secondsLeft <= 10 && secondsLeft > 0 && warnedForTurn.current !== warningKey) {
        warnedForTurn.current = warningKey;
        void playGameSoundEffect("warn10");
      }
    };

    tick();
    const interval = window.setInterval(tick, 250);

    return () => window.clearInterval(interval);
  }, [deadlineAt, phase, startedAt, turnMode]);
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

function findPacketForPlayer(payload: DrawNGuessSyncDto, playerId: string) {
  return (
    payload.public.packets?.find((packet) => packet.starterPlayerId === playerId) ??
    (payload.public.revealPacket?.starterPlayerId === playerId ? payload.public.revealPacket : null)
  );
}

function avatarIdFor(value: string | undefined): AvatarId {
  return isAvatarId(value) ? value : "bear";
}

function downloadChainImage(packet: DrawNGuessPacket, ownerName: string) {
  const width = 900;
  const rowHeight = 300;
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
      drawEntryImage(ctx, entry.drawing, padding + 28, top + 58, width - padding * 2 - 56, 200);
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
  const fit = containRect(preview.width, preview.height, x, y, width, height);
  ctx.drawImage(preview, fit.x, fit.y, fit.width, fit.height);
}

function containRect(
  sourceWidth: number,
  sourceHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const fittedWidth = sourceWidth * scale;
  const fittedHeight = sourceHeight * scale;

  return {
    x: x + (width - fittedWidth) / 2,
    y: y + (height - fittedHeight) / 2,
    width: fittedWidth,
    height: fittedHeight,
  };
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
