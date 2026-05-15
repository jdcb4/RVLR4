import { type FormEvent, useState } from "react";

import {
  IconArrowLeftRight,
  IconArrowRightToLine,
  IconCheck,
  IconCrown,
  IconPencil,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { captainPlayerIdForTeam } from "@/features/multiplayer/lobbyCaptain";
import type { LobbyDto, LobbyPlayerDto } from "@/multiplayer/roomTypes";

type EmitWithAck = (
  event: string,
  body?: unknown,
) => Promise<{ ok?: boolean; error?: string } | undefined>;

export function LobbyTeamsSection({
  lobby,
  myPlayerId,
  isHost,
  emitWithAck,
}: {
  readonly lobby: LobbyDto;
  readonly myPlayerId: string;
  readonly isHost: boolean;
  readonly emitWithAck: EmitWithAck;
}) {
  const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [hostMoveTarget, setHostMoveTarget] = useState<LobbyPlayerDto | null>(null);
  const [hostMoveTeamPick, setHostMoveTeamPick] = useState(0);

  const myTeamIndex = lobby.players.find((player) => player.id === myPlayerId)?.teamIndex ?? 0;

  const openEdit = (teamIndex: number) => {
    setEditingTeamIndex(teamIndex);
    setEditDraft(teamDisplayName(lobby, teamIndex));
  };

  const submitRename = async () => {
    if (editingTeamIndex === null) {
      return;
    }

    const eventName = isHost ? "lobby:hostSetTeamName" : "lobby:captainSetTeamName";
    await emitWithAck(eventName, {
      teamIndex: editingTeamIndex,
      name: editDraft.trim().slice(0, 24),
    });
    setEditingTeamIndex(null);
  };

  const openHostMovePlayer = (player: LobbyPlayerDto) => {
    setHostMoveTarget(player);
    setHostMoveTeamPick(player.teamIndex ?? 0);
  };

  const closeHostMovePlayer = () => {
    setHostMoveTarget(null);
  };

  const confirmHostMovePlayer = () => {
    if (!hostMoveTarget) {
      return;
    }

    void emitWithAck("lobby:hostMovePlayer", {
      playerId: hostMoveTarget.id,
      teamIndex: hostMoveTeamPick,
    });
    closeHostMovePlayer();
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {Array.from({ length: lobby.teamCount }).map((_, teamIndex) => (
          <LobbyTeamCard
            editDraft={editDraft}
            editing={editingTeamIndex === teamIndex}
            emitWithAck={emitWithAck}
            isHost={isHost}
            key={teamIndex}
            lobby={lobby}
            myPlayerId={myPlayerId}
            myTeamIndex={myTeamIndex}
            teamIndex={teamIndex}
            onCancelEdit={() => setEditingTeamIndex(null)}
            onEditDraftChange={setEditDraft}
            onOpenEdit={openEdit}
            onOpenHostMovePlayer={openHostMovePlayer}
            onSubmitRename={() => {
              void submitRename();
            }}
          />
        ))}
      </div>

      {hostMoveTarget ? (
        <HostMovePlayerDialog
          lobby={lobby}
          selectedTeamIndex={hostMoveTeamPick}
          target={hostMoveTarget}
          onCancel={closeHostMovePlayer}
          onConfirm={confirmHostMovePlayer}
          onSelectedTeamIndexChange={setHostMoveTeamPick}
        />
      ) : null}
    </>
  );
}

function LobbyTeamCard({
  lobby,
  teamIndex,
  myPlayerId,
  myTeamIndex,
  isHost,
  editing,
  editDraft,
  emitWithAck,
  onOpenEdit,
  onCancelEdit,
  onEditDraftChange,
  onSubmitRename,
  onOpenHostMovePlayer,
}: {
  readonly lobby: LobbyDto;
  readonly teamIndex: number;
  readonly myPlayerId: string;
  readonly myTeamIndex: number;
  readonly isHost: boolean;
  readonly editing: boolean;
  readonly editDraft: string;
  readonly emitWithAck: EmitWithAck;
  readonly onOpenEdit: (teamIndex: number) => void;
  readonly onCancelEdit: () => void;
  readonly onEditDraftChange: (value: string) => void;
  readonly onSubmitRename: () => void;
  readonly onOpenHostMovePlayer: (player: LobbyPlayerDto) => void;
}) {
  const captainId = captainPlayerIdForTeam(lobby, teamIndex);
  const displayName = teamDisplayName(lobby, teamIndex);
  const canRename = isHost || (captainId !== undefined && captainId === myPlayerId);
  const showJoinArrow = myTeamIndex !== teamIndex;
  const members = playersForTeam(lobby, teamIndex);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <TeamHeader
        canRename={canRename}
        displayName={displayName}
        editDraft={editDraft}
        editing={editing}
        emitWithAck={emitWithAck}
        isHost={isHost}
        myPlayerId={myPlayerId}
        showJoinArrow={showJoinArrow}
        teamIndex={teamIndex}
        onCancelEdit={onCancelEdit}
        onEditDraftChange={onEditDraftChange}
        onOpenEdit={onOpenEdit}
        onSubmitRename={onSubmitRename}
      />
      <ul className="divide-y divide-border px-3 py-1">
        {members.map((player) => (
          <LobbyTeamPlayerRow
            captainId={captainId}
            isHost={isHost}
            key={player.id}
            player={player}
            onOpenHostMovePlayer={onOpenHostMovePlayer}
          />
        ))}
        {members.length === 0 ? (
          <li className="py-3 text-typ-ui text-muted-foreground">No players yet</li>
        ) : null}
      </ul>
    </section>
  );
}

function TeamHeader({
  displayName,
  editing,
  editDraft,
  canRename,
  showJoinArrow,
  myPlayerId,
  teamIndex,
  isHost,
  emitWithAck,
  onOpenEdit,
  onCancelEdit,
  onEditDraftChange,
  onSubmitRename,
}: {
  readonly displayName: string;
  readonly editing: boolean;
  readonly editDraft: string;
  readonly canRename: boolean;
  readonly showJoinArrow: boolean;
  readonly myPlayerId: string;
  readonly teamIndex: number;
  readonly isHost: boolean;
  readonly emitWithAck: EmitWithAck;
  readonly onOpenEdit: (teamIndex: number) => void;
  readonly onCancelEdit: () => void;
  readonly onEditDraftChange: (value: string) => void;
  readonly onSubmitRename: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
      <div className="min-w-0 flex-1">
        {editing ? (
          <TeamRenameForm
            draft={editDraft}
            onCancel={onCancelEdit}
            onDraftChange={onEditDraftChange}
            onSubmit={onSubmitRename}
          />
        ) : (
          <TeamTitle
            canRename={canRename}
            displayName={displayName}
            teamIndex={teamIndex}
            onOpenEdit={onOpenEdit}
          />
        )}
      </div>
      {showJoinArrow ? (
        <button
          aria-label={`Join ${displayName}`}
          className="shrink-0 rounded-xl border border-input bg-background p-2 text-primary shadow-sm transition hover:bg-accent"
          type="button"
          onClick={() =>
            void emitWithAck(
              isHost ? "lobby:hostMovePlayer" : "lobby:moveSelf",
              isHost ? { playerId: myPlayerId, teamIndex } : { teamIndex },
            )
          }
        >
          <IconArrowRightToLine className="size-5" />
        </button>
      ) : (
        <span className="shrink-0 rounded-xl border border-dashed border-muted-foreground/40 px-2 py-1 text-typ-ui text-muted-foreground">
          Your team
        </span>
      )}
    </div>
  );
}

function TeamTitle({
  displayName,
  canRename,
  teamIndex,
  onOpenEdit,
}: {
  readonly displayName: string;
  readonly canRename: boolean;
  readonly teamIndex: number;
  readonly onOpenEdit: (teamIndex: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <p className="truncate text-typ-card-title font-semibold">{displayName}</p>
      {canRename ? (
        <button
          aria-label={`Rename ${displayName}`}
          className="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          type="button"
          onClick={() => onOpenEdit(teamIndex)}
        >
          <IconPencil className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function TeamRenameForm({
  draft,
  onDraftChange,
  onCancel,
  onSubmit,
}: {
  readonly draft: string;
  readonly onDraftChange: (value: string) => void;
  readonly onCancel: () => void;
  readonly onSubmit: () => void;
}) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={handleSubmit}>
      <input
        autoFocus
        className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2 py-1 text-typ-ui"
        maxLength={24}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
      />
      <Button size="sm" type="submit" variant="default">
        Save
      </Button>
      <Button size="sm" type="button" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}

function LobbyTeamPlayerRow({
  player,
  captainId,
  isHost,
  onOpenHostMovePlayer,
}: {
  readonly player: LobbyPlayerDto;
  readonly captainId: string | undefined;
  readonly isHost: boolean;
  readonly onOpenHostMovePlayer: (player: LobbyPlayerDto) => void;
}) {
  return (
    <li className="flex items-center gap-2 py-2 text-typ-ui">
      {player.ready ? (
        <IconCheck aria-hidden className="size-4 shrink-0 text-emerald-600" />
      ) : (
        <span aria-hidden className="inline-block size-4 shrink-0" />
      )}
      {captainId === player.id ? (
        <span className="inline-flex shrink-0" title="Team captain">
          <IconCrown className="size-4 text-amber-600" />
        </span>
      ) : (
        <span aria-hidden className="inline-block size-4 shrink-0" />
      )}
      <span className="min-w-0 flex-1">
        {player.name}
        {player.isHost ? (
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-typ-ui text-muted-foreground">
            Host
          </span>
        ) : null}
        {player.disconnectedAt ? <span className="ml-2 text-destructive">Away</span> : null}
      </span>
      {isHost ? (
        <button
          aria-label={`Choose team for ${player.name}`}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          type="button"
          onClick={() => onOpenHostMovePlayer(player)}
        >
          <IconArrowLeftRight className="size-4" />
        </button>
      ) : null}
    </li>
  );
}

function HostMovePlayerDialog({
  lobby,
  target,
  selectedTeamIndex,
  onSelectedTeamIndexChange,
  onCancel,
  onConfirm,
}: {
  readonly lobby: LobbyDto;
  readonly target: LobbyPlayerDto;
  readonly selectedTeamIndex: number;
  readonly onSelectedTeamIndexChange: (teamIndex: number) => void;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 px-4 py-8"
      role="dialog"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md cursor-default rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-typ-card-title font-semibold leading-snug">
          What team do you want to move {target.name} to?
        </p>
        <label className="mt-4 block text-typ-ui font-medium" htmlFor="host-move-team">
          Team
        </label>
        <select
          className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-typ-ui"
          id="host-move-team"
          value={selectedTeamIndex}
          onChange={(event) => onSelectedTeamIndexChange(Number(event.target.value))}
        >
          {Array.from({ length: lobby.teamCount }).map((_, teamIndex) => (
            <option key={teamIndex} value={teamIndex}>
              {teamDisplayName(lobby, teamIndex)}
            </option>
          ))}
        </select>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            Move
          </Button>
        </div>
      </div>
    </div>
  );
}

function playersForTeam(lobby: LobbyDto, teamIndex: number) {
  return lobby.players.filter((player) => (player.teamIndex ?? 0) === teamIndex);
}

function teamDisplayName(lobby: LobbyDto, teamIndex: number) {
  return lobby.teamNames[teamIndex] ?? `Team ${teamIndex + 1}`;
}
