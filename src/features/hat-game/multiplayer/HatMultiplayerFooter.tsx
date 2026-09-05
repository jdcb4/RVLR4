import type { Dispatch, SetStateAction } from "react";

import { PrimaryFooterButton } from "@/components/game/GameFooterButtons";
import { getHatGameContext } from "@/domain/hat-game/engine";
import type { HatGameSession } from "@/domain/hat-game/types";
import type { HatSyncDto } from "@/domain/multiplayer/protocol";
import type { EmitWithAck } from "@/domain/multiplayer/protocol";
import type { ReplaySync } from "@/domain/multiplayer/protocol";
import { MultiplayerEndGameActions } from "@/features/multiplayer/MultiplayerGameShell";
import { MultiplayerSkipCorrectFooter } from "@/features/multiplayer/MultiplayerSkipCorrectFooter";
import { multiplayerUpNextHeadingTitle } from "@/multiplayer/upNextHeading";

export function HatMultiplayerFooter({
  session,
  payload,
  viewerPlayerId,
  isHost,
  replaySync,
  busy,
  showScoresPane,
  emitWithAck,
  setBusy,
  setError,
  onShowScoresPane,
}: {
  readonly session: HatGameSession;
  readonly payload: HatSyncDto;
  readonly viewerPlayerId: string;
  readonly isHost: boolean;
  readonly replaySync: ReplaySync;
  readonly busy: boolean;
  readonly showScoresPane: boolean;
  readonly emitWithAck: EmitWithAck;
  readonly setBusy: Dispatch<SetStateAction<boolean>>;
  readonly setError: (message: string) => void;
  readonly onShowScoresPane: () => void;
}) {
  const activeTurn = session.activeTurn;

  if (session.stage === "ready") {
    return (
      <ReadyFooter
        busy={busy}
        emitWithAck={emitWithAck}
        role={payload.role}
        session={session}
        setBusy={setBusy}
        setError={setError}
        viewerPlayerId={viewerPlayerId}
      />
    );
  }

  if (session.stage === "turn" && activeTurn && payload.showTurnFooter) {
    return (
      <MultiplayerSkipCorrectFooter
        busy={busy}
        correctEvent="hat:correct"
        emitWithAck={emitWithAck}
        setBusy={setBusy}
        setError={setError}
        skipDisabled={(activeTurn.skipsRemaining ?? 0) <= 0}
        skipEvent="hat:skip"
      />
    );
  }

  if (session.stage === "finalSummary") {
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

  if (session.stage === "results") {
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
  session,
  role,
  viewerPlayerId,
  busy,
  emitWithAck,
  setBusy,
  setError,
}: {
  readonly session: HatGameSession;
  readonly role: HatSyncDto["role"];
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
        label={readyFooterLabel(session, viewerPlayerId)}
        onClick={() => {}}
      />
    );
  }

  return (
    <PrimaryFooterButton
      disabled={busy}
      label={busy ? "Loading..." : "Start turn"}
      onClick={async () => {
        setBusy(true);
        const ack = await emitWithAck("hat:startTurn");

        if (ack?.ok === false) {
          setError(ack.error ?? "");
        }

        setBusy(false);
      }}
    />
  );
}

function readyFooterLabel(session: HatGameSession, viewerPlayerId: string) {
  const context = getHatGameContext(session);
  const viewerTeamId = session.players.find((player) => player.id === viewerPlayerId)?.teamId;

  return multiplayerUpNextHeadingTitle({
    viewerPlayerId,
    viewerTeamId,
    nextTeamId: context.activeTeamId,
    nextDescriberPlayerId: context.activeDescriberId,
    nextTeamDisplayName: context.activeTeam?.name ?? "Team",
  });
}
