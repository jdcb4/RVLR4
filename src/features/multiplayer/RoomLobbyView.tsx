import { SecondaryFooterButton } from "@/components/game/GameFooterButtons";
import { GameShell } from "@/components/GameShell";
import { IconCheck } from "@/components/icons";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { GameSpecificLobbySections } from "@/features/multiplayer/GameSpecificLobbySections";
import { LobbyInviteSection, QrJoinDialog } from "@/features/multiplayer/LobbyInviteSection";
import { LobbyTeamsSection } from "@/features/multiplayer/LobbyTeamsSection";
import { cn } from "@/lib/utils";
import type { LobbyDto, LobbyPlayerDto, RoomSyncPayload } from "@/multiplayer/roomTypes";

type EmitWithAck = (
  event: string,
  body?: unknown,
) => Promise<{ ok?: boolean; error?: string } | undefined>;

export function RoomLobbyView({
  sync,
  lobby,
  connected,
  joinLink,
  canNativeShare,
  copiedToast,
  qrToastOpen,
  startError,
  emitWithAck,
  onCopyLink,
  onShareLink,
  onOpenQrToast,
  onCloseQrToast,
  onStartGame,
}: {
  readonly sync: RoomSyncPayload;
  readonly lobby: LobbyDto;
  readonly connected: boolean;
  readonly joinLink: string;
  readonly canNativeShare: boolean;
  readonly copiedToast: boolean;
  readonly qrToastOpen: boolean;
  readonly startError: string | null;
  readonly emitWithAck: EmitWithAck;
  readonly onCopyLink: () => Promise<void>;
  readonly onShareLink: () => Promise<void>;
  readonly onOpenQrToast: () => void;
  readonly onCloseQrToast: () => void;
  readonly onStartGame: () => Promise<void>;
}) {
  const isHost = sync.you.isHost;
  const myId = sync.you.playerId;
  const isTeamGame = sync.gameKind === "whowhatwhere" || sync.gameKind === "hat";
  const denseLobby = isTeamGame && lobby.players.length >= 6;

  return (
    <>
      <GameShell
        footer={
          isHost ? (
            <div className="flex w-full flex-col gap-2">
              <SecondaryFooterButton
                disabled={!connected || !lobby.startReadiness.canStart}
                label="Start game"
                onClick={() => {
                  void onStartGame();
                }}
              />
            </div>
          ) : (
            <PlayerReadyBar
              emitWithAck={emitWithAck}
              ready={lobby.players.find((player) => player.id === myId)?.ready ?? false}
            />
          )
        }
        title="Lobby"
      >
        <div className={`flex flex-col ${denseLobby ? "gap-3 pb-4" : "gap-4 pb-6"}`}>
          <LobbyInviteSection
            canNativeShare={canNativeShare}
            code={sync.code}
            connected={connected}
            copiedToast={copiedToast}
            compact={denseLobby}
            onCopyLink={onCopyLink}
            onOpenQrToast={onOpenQrToast}
            onShareLink={onShareLink}
          />

          {isTeamGame ? (
            <LobbyTeamsSection
              emitWithAck={emitWithAck}
              isHost={isHost}
              lobby={lobby}
              myPlayerId={myId}
            />
          ) : (
            <FlatPlayersSection players={lobby.players} />
          )}

          <GameSpecificLobbySections
            emitWithAck={emitWithAck}
            isHost={isHost}
            lobby={lobby}
            sync={sync}
          />

          {isHost ? <LobbyStartStatus connected={connected} lobby={lobby} /> : null}

          {startError ? (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-typ-ui text-destructive">
              {startError}
            </p>
          ) : null}
        </div>
      </GameShell>

      {qrToastOpen ? <QrJoinDialog joinLink={joinLink} onClose={onCloseQrToast} /> : null}
    </>
  );
}

function LobbyStartStatus({
  connected,
  lobby,
}: {
  readonly connected: boolean;
  readonly lobby: LobbyDto;
}) {
  const messages = connected
    ? lobby.startReadiness.blockers.map(({ message }) => message)
    : ["Reconnecting before the game can start."];

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm" aria-live="polite">
      <p className="text-typ-card-title font-semibold">Ready to start?</p>
      {messages.length === 0 ? (
        <p className="mt-2 text-typ-ui text-emerald-700">Everyone is ready.</p>
      ) : (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-typ-ui text-muted-foreground">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FlatPlayersSection({ players }: { readonly players: readonly LobbyPlayerDto[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-typ-card-title font-semibold">Players</p>
      <ul className="mt-3 space-y-2 text-typ-ui">
        {players.map((player) => (
          <li className="flex items-center gap-2" key={player.id}>
            {player.ready ? (
              <IconCheck aria-hidden className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <span aria-hidden className="inline-block size-4 shrink-0" />
            )}
            <PlayerAvatar avatarId={player.avatarId} className="size-9" name={player.name} />
            <span>
              {player.name}
              {player.isHost ? (
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-typ-ui text-muted-foreground">
                  Host
                </span>
              ) : null}
              {player.disconnectedAt ? <span className="ml-2 text-destructive">Away</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlayerReadyBar({
  ready,
  emitWithAck,
}: {
  readonly ready: boolean;
  readonly emitWithAck: EmitWithAck;
}) {
  return (
    <Button
      className={cn(
        "flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-xl text-typ-ui font-semibold shadow-sm transition-colors",
        ready
          ? "border border-emerald-700/30 bg-emerald-600 text-white hover:bg-emerald-700"
          : "bg-primary text-primary-foreground hover:bg-semantic-primary-hover",
      )}
      type="button"
      onClick={() => {
        void emitWithAck("lobby:setReady", { ready: !ready });
      }}
    >
      {ready ? "Tap again if not ready" : "Mark ready"}
    </Button>
  );
}
