import { type FormEvent, useState } from "react";

import {
  IconArrowLeftRight,
  IconArrowRightToLine,
  IconCheck,
  IconCrown,
  IconPencil,
} from "@/components/icons";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Button } from "@/components/ui/button";
import type { LobbyDto, LobbyPlayerDto } from "@/domain/multiplayer/protocol";
import type { EmitWithAck } from "@/domain/multiplayer/protocol";
import { captainPlayerIdForTeam } from "@/features/multiplayer/lobbyCaptain";
import { cn } from "@/lib/utils";

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
  const dense = lobby.players.length >= 6;

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
      <div
        className={cn("flex flex-col", dense ? "gap-3" : "gap-4")}
        data-dense={dense || undefined}
      >
        {Array.from({ length: lobby.teamCount }).map((_, teamIndex) => (
          <LobbyTeamCard
            editDraft={editDraft}
            dense={dense}
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
  dense,
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
  readonly dense: boolean;
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
  const compactPlayers = dense && !editing;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <TeamHeader
        canRename={canRename}
        displayName={displayName}
        compact={compactPlayers}
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
      <ul
        className={cn(
          compactPlayers ? "grid grid-cols-2 gap-1.5 p-2" : "divide-y divide-border px-3 py-1",
        )}
      >
        {members.map((player) => (
          <LobbyTeamPlayerRow
            captainId={captainId}
            compact={compactPlayers}
            isHost={isHost}
            key={player.id}
            player={player}
            onOpenHostMovePlayer={onOpenHostMovePlayer}
          />
        ))}
        {members.length === 0 ? (
          <li
            className={cn("py-3 text-typ-ui text-muted-foreground", compactPlayers && "col-span-2")}
          >
            No players yet
          </li>
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
  compact,
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
  readonly compact: boolean;
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
    <div
      className={cn(
        "flex items-center gap-2 border-b border-border bg-muted/30 px-3",
        compact ? "py-1.5" : "py-2",
      )}
    >
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
            void (isHost
              ? emitWithAck("lobby:hostMovePlayer", { playerId: myPlayerId, teamIndex })
              : emitWithAck("lobby:moveSelf", { teamIndex }))
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
        autoCapitalize="words"
        autoComplete="off"
        aria-label="Team name"
        ref={(input) => {
          input?.focus();
        }}
        className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2 py-1 text-typ-ui"
        enterKeyHint="done"
        inputMode="text"
        maxLength={24}
        spellCheck={false}
        type="text"
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
  compact,
  onOpenHostMovePlayer,
}: {
  readonly player: LobbyPlayerDto;
  readonly captainId: string | undefined;
  readonly isHost: boolean;
  readonly compact: boolean;
  readonly onOpenHostMovePlayer: (player: LobbyPlayerDto) => void;
}) {
  if (compact) {
    const details = [
      player.ready ? "Ready" : "Not ready",
      captainId === player.id ? "Captain" : null,
      player.isHost ? "Host" : null,
      player.disconnectedAt ? "Away" : null,
    ].filter(Boolean);
    const content = (
      <>
        <PlayerAvatar avatarId={player.avatarId} className="size-7 shrink-0" name={player.name} />
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate font-medium text-typ-ui" title={player.name}>
            {player.name}
          </span>
          <span
            className={cn(
              "block truncate text-typ-micro",
              player.disconnectedAt ? "text-destructive" : "text-muted-foreground",
            )}
            title={details.join(" · ")}
          >
            {details.join(" · ")}
          </span>
        </span>
        {isHost ? <IconArrowLeftRight className="size-4 shrink-0 text-muted-foreground" /> : null}
      </>
    );

    return (
      <li className="min-w-0">
        {isHost ? (
          <button
            aria-label={`Choose team for ${player.name}`}
            className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-2 py-1.5 transition hover:bg-muted"
            type="button"
            onClick={() => onOpenHostMovePlayer(player)}
          >
            {content}
          </button>
        ) : (
          <div className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-2 py-1.5">
            {content}
          </div>
        )}
      </li>
    );
  }

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
      <PlayerAvatar avatarId={player.avatarId} className="size-8" name={player.name} />
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
    <ModalDialog title={`What team do you want to move ${target.name} to?`} onClose={onCancel}>
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
    </ModalDialog>
  );
}

function playersForTeam(lobby: LobbyDto, teamIndex: number) {
  return lobby.players.filter((player) => (player.teamIndex ?? 0) === teamIndex);
}

function teamDisplayName(lobby: LobbyDto, teamIndex: number) {
  return lobby.teamNames[teamIndex] ?? `Team ${teamIndex + 1}`;
}
import { ModalDialog } from "@/components/ModalDialog";
