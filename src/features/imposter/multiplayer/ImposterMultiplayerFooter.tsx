import type { ReactNode } from "react";

import { PrimaryFooterButton } from "@/components/game/GameFooterButtons";
import type { ImposterRoundState, ImposterSnapshot } from "@/domain/imposter/types";
import type { ImposterSyncDto } from "@/domain/multiplayer/protocol";
import type { SocketInput } from "@/domain/multiplayer/protocol";
import { MultiplayerEndGameActions } from "@/features/multiplayer/MultiplayerGameShell";

import { getParallelRevealProgress } from "./imposterMultiplayerReveal";
export type ImposterMultiplayerDispatch = (
  action: SocketInput<"imposter:dispatch">,
) => Promise<void>;

import type { EmitWithAck } from "@/domain/multiplayer/protocol";
import type { ReplaySync } from "@/domain/multiplayer/protocol";

export function ImposterMultiplayerFooter({
  payload,
  viewerPlayerId,
  isHost,
  busy,
  replaySync,
  emitWithAck,
  onDispatch,
}: {
  readonly payload: ImposterSyncDto;
  readonly viewerPlayerId: string;
  readonly isHost: boolean;
  readonly busy: boolean;
  readonly replaySync: ReplaySync;
  readonly emitWithAck: EmitWithAck;
  readonly onDispatch: ImposterMultiplayerDispatch;
}): ReactNode {
  const { snapshot, revealSubjectId } = payload;
  const round = snapshot.round;
  const step = snapshot.step;

  if (step === "reveal" && round && revealSubjectId) {
    return (
      <RevealFooter
        busy={busy}
        revealSubjectId={revealSubjectId}
        round={round}
        snapshot={snapshot}
        viewerPlayerId={viewerPlayerId}
        onDispatch={onDispatch}
      />
    );
  }

  if (step === "guidePregame") {
    return (
      <HostAdvanceFooter
        actionType="guide-pregame-done"
        busy={busy}
        isHost={isHost}
        label="Ready for discussion"
        onDispatch={onDispatch}
      />
    );
  }

  if (step === "guidePrediscussion") {
    return (
      <HostAdvanceFooter
        actionType="guide-prediscussion-done"
        busy={busy}
        isHost={isHost}
        label="Vote done"
        onDispatch={onDispatch}
      />
    );
  }

  if (step === "guideWarning") {
    return (
      <HostAdvanceFooter
        actionType="guide-warning-done"
        busy={busy}
        isHost={isHost}
        label="Reveal"
        onDispatch={onDispatch}
      />
    );
  }

  if (step === "results") {
    return (
      <MultiplayerEndGameActions
        emitWithAck={emitWithAck}
        isHost={isHost}
        replaySync={replaySync}
        viewerPlayerId={viewerPlayerId}
      />
    );
  }

  return undefined;
}

function RevealFooter({
  snapshot,
  round,
  revealSubjectId,
  viewerPlayerId,
  busy,
  onDispatch,
}: {
  readonly snapshot: ImposterSnapshot;
  readonly round: ImposterRoundState;
  readonly revealSubjectId: string;
  readonly viewerPlayerId: string;
  readonly busy: boolean;
  readonly onDispatch: ImposterMultiplayerDispatch;
}) {
  const parallelProgress = getParallelRevealProgress(round, viewerPlayerId);

  if (parallelProgress) {
    return (
      <ParallelRevealFooter
        busy={busy}
        done={parallelProgress.done}
        seen={parallelProgress.seen}
        onDispatch={onDispatch}
      />
    );
  }

  return (
    <SequentialRevealFooter
      busy={busy}
      canInteract={viewerPlayerId === revealSubjectId}
      isLast={round.revealPlayerIndex >= snapshot.players.length - 1}
      playerName={snapshot.players[round.revealPlayerIndex]?.name ?? "Player"}
      revealed={round.revealRevealed}
      onDispatch={onDispatch}
    />
  );
}

function ParallelRevealFooter({
  seen,
  done,
  busy,
  onDispatch,
}: {
  readonly seen: boolean;
  readonly done: boolean;
  readonly busy: boolean;
  readonly onDispatch: ImposterMultiplayerDispatch;
}) {
  if (!seen) {
    return (
      <PrimaryFooterButton
        disabled={busy}
        label="Reveal my role"
        onClick={() => void onDispatch({ type: "reveal-show-role" })}
      />
    );
  }

  if (!done) {
    return (
      <PrimaryFooterButton
        disabled={busy}
        label="Continue"
        onClick={() => void onDispatch({ type: "reveal-confirm-next" })}
      />
    );
  }

  return <PrimaryFooterButton disabled label="Waiting for other players..." onClick={() => {}} />;
}

function SequentialRevealFooter({
  playerName,
  revealed,
  isLast,
  canInteract,
  busy,
  onDispatch,
}: {
  readonly playerName: string;
  readonly revealed: boolean;
  readonly isLast: boolean;
  readonly canInteract: boolean;
  readonly busy: boolean;
  readonly onDispatch: ImposterMultiplayerDispatch;
}) {
  if (!revealed) {
    return (
      <PrimaryFooterButton
        disabled={busy || !canInteract}
        label={`${playerName} ready`}
        onClick={() => void onDispatch({ type: "reveal-show-role" })}
      />
    );
  }

  return (
    <PrimaryFooterButton
      disabled={busy || !canInteract}
      label={isLast ? "Continue to clues" : "Confirm and pass on"}
      onClick={() => void onDispatch({ type: "reveal-confirm-next" })}
    />
  );
}

function HostAdvanceFooter({
  label,
  actionType,
  busy,
  isHost,
  onDispatch,
}: {
  readonly label: string;
  readonly actionType: SocketInput<"imposter:dispatch">["type"];
  readonly busy: boolean;
  readonly isHost: boolean;
  readonly onDispatch: ImposterMultiplayerDispatch;
}) {
  return (
    <PrimaryFooterButton
      disabled={busy || !isHost}
      label={label}
      onClick={() => void onDispatch({ type: actionType })}
    />
  );
}
