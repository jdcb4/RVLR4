import type { Dispatch, SetStateAction } from "react";

import { PrimaryFooterButton } from "@/components/game/GameFooterButtons";
import type { WhoWhatWherePeerRole } from "@/domain/multiplayer/protocol";
import type { EmitWithAck } from "@/domain/multiplayer/protocol";
import type { ReplaySync } from "@/domain/multiplayer/protocol";
import { canQueueSkipped, getActiveContext } from "@/domain/whowhatwhere/game";
import type { MatchState } from "@/domain/whowhatwhere/types";
import { MultiplayerEndGameActions } from "@/features/multiplayer/MultiplayerGameShell";
import { MultiplayerSkipCorrectFooter } from "@/features/multiplayer/MultiplayerSkipCorrectFooter";
import { multiplayerUpNextHeadingTitle } from "@/multiplayer/upNextHeading";

export function WhoWhatWhereMultiplayerFooter({
  match,
  role,
  viewerPlayerId,
  isHost,
  replaySync,
  busy,
  showScoresPane,
  showTurnFooter,
  emitWithAck,
  setBusy,
  setError,
  onShowScoresPane,
}: {
  readonly match: MatchState;
  readonly role: WhoWhatWherePeerRole;
  readonly viewerPlayerId: string;
  readonly isHost: boolean;
  readonly replaySync: ReplaySync;
  readonly busy: boolean;
  readonly showScoresPane: boolean;
  readonly showTurnFooter: boolean;
  readonly emitWithAck: EmitWithAck;
  readonly setBusy: Dispatch<SetStateAction<boolean>>;
  readonly setError: (message: string) => void;
  readonly onShowScoresPane: () => void;
}) {
  if (match.stage === "ready") {
    return (
      <ReadyFooter
        busy={busy}
        emitWithAck={emitWithAck}
        match={match}
        role={role}
        setBusy={setBusy}
        setError={setError}
        viewerPlayerId={viewerPlayerId}
      />
    );
  }

  if (match.stage === "turn" && match.activeTurn && showTurnFooter) {
    return (
      <MultiplayerSkipCorrectFooter
        busy={busy}
        correctEvent="www:correct"
        emitWithAck={emitWithAck}
        setBusy={setBusy}
        setError={setError}
        skipDisabled={!canQueueSkipped(match.activeTurn)}
        skipEvent="www:skip"
      />
    );
  }

  if (match.stage === "finalSummary") {
    return showScoresPane ? (
      <MultiplayerEndGameActions
        emitWithAck={emitWithAck}
        isHost={isHost}
        replaySync={replaySync}
        viewerPlayerId={viewerPlayerId}
      />
    ) : (
      <PrimaryFooterButton disabled={busy} label="Final scores" onClick={onShowScoresPane} />
    );
  }

  if (match.stage === "results") {
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

function ReadyFooter({
  match,
  role,
  viewerPlayerId,
  busy,
  emitWithAck,
  setBusy,
  setError,
}: {
  readonly match: MatchState;
  readonly role: WhoWhatWherePeerRole;
  readonly viewerPlayerId: string;
  readonly busy: boolean;
  readonly emitWithAck: EmitWithAck;
  readonly setBusy: Dispatch<SetStateAction<boolean>>;
  readonly setError: (message: string) => void;
}) {
  if (role !== "describer") {
    return (
      <PrimaryFooterButton
        disabled
        label={readyFooterLabel(match, viewerPlayerId)}
        onClick={() => {}}
      />
    );
  }

  return (
    <PrimaryFooterButton
      disabled={busy}
      label={busy ? "Loading words" : "Start turn"}
      onClick={async () => {
        setBusy(true);
        const ack = await emitWithAck("www:startTurn");

        if (ack?.ok === false) {
          setError(ack.error ?? "");
        }

        setBusy(false);
      }}
    />
  );
}

function readyFooterLabel(match: MatchState, viewerPlayerId: string) {
  const waitingContext = getActiveContext(match);
  const viewerTeamId = match.players.find((player) => player.id === viewerPlayerId)?.teamId;

  return multiplayerUpNextHeadingTitle({
    viewerPlayerId,
    viewerTeamId,
    nextTeamId: waitingContext.team.id,
    nextDescriberPlayerId: waitingContext.describer.id,
    nextTeamDisplayName: waitingContext.team.name,
  });
}
