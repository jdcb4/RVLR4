import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { QRCode } from "react-qr-code";
import { useNavigate, useParams } from "react-router-dom";

import {
  FooterIconSlotButton,
  PrimaryFooterButton,
  SecondaryFooterButton,
} from "@/components/game/GameFooterButtons";
import { GameShell } from "@/components/GameShell";
import {
  IconArrowLeftRight,
  IconArrowRightToLine,
  IconCheck,
  IconClipboard,
  IconCrown,
  IconPencil,
  IconQrCode,
  IconX,
} from "@/components/icons";
import { TeamCountOptionGroup } from "@/components/setup/TeamCountOptionGroup";
import { Button } from "@/components/ui/button";
import { GAME_DEFAULTS } from "@/config/hatGameDefaults";
import type { SharedTeamCount } from "@/config/teamRoster";
import { maxImpostersForPlayers } from "@/domain/imposter/round";
import { HatMultiplayerView } from "@/features/hat-game/multiplayer/HatMultiplayerView";
import { HAT_CLUE_INPUT_CLASS } from "@/features/hat-game/screens/hatScreenTokens";
import { ImposterMultiplayerView } from "@/features/imposter/multiplayer/ImposterMultiplayerView";
import { captainPlayerIdForTeam } from "@/features/multiplayer/lobbyCaptain";
import { WhoWhatWhereMultiplayerView } from "@/features/whowhatwhere/multiplayer/WhoWhatWhereMultiplayerView";
import { SettingsScreen } from "@/features/whowhatwhere/setup/SettingsScreen";
import { cn } from "@/lib/utils";
import {
  clearActiveGameBookmark,
  writeActiveGameBookmark,
} from "@/multiplayer/activeGameBookmark";
import type { LobbyDto, LobbyPlayerDto } from "@/multiplayer/roomTypes";
import { useRoomChannel } from "@/multiplayer/useRoomChannel";

function shareUrl(code: string) {
  const url = new URL(window.location.origin);

  url.pathname = "/name";
  url.searchParams.set("intent", "join");
  url.searchParams.set("code", code);

  return url.toString();
}

function HatLobbyFamousFiguresSection({
  emitWithAck,
  drafts,
  clueSlots,
}: {
  readonly emitWithAck: (
    event: string,
    body?: unknown,
  ) => Promise<{ ok?: boolean; error?: string } | undefined>;
  readonly drafts: readonly string[];
  readonly clueSlots: number;
}) {
  const rowValues = useMemo(() => {
    const padded = [...drafts];

    while (padded.length < clueSlots) {
      padded.push("");
    }

    return padded.slice(0, clueSlots);
  }, [drafts, clueSlots]);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-typ-card-title font-semibold">Your famous figures</p>
      <p className="mt-1 text-typ-ui-snug text-muted-foreground">
        Enter six people or characters your table will recognize. Tap the lightning if you
        want a random suggestion for that row.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-typ-ui">
          <tbody>
            {Array.from({ length: clueSlots }).map((_, index) => (
              <tr className="border-b border-border last:border-b-0" key={index}>
                <td className="py-2 pr-2 align-middle tabular-nums text-muted-foreground">
                  {index + 1}
                </td>
                <td className="py-2 pr-2 align-middle">
                  <input
                    className={`${HAT_CLUE_INPUT_CLASS} w-full min-w-0`}
                    maxLength={GAME_DEFAULTS.maxClueLength}
                    placeholder="Enter a famous figure"
                    value={rowValues[index] ?? ""}
                    onChange={(event) => {
                      void emitWithAck("lobby:hatSetClueCell", {
                        clueIndex: index,
                        value: event.target.value,
                      });
                    }}
                  />
                </td>
                <td className="w-14 py-2 align-middle">
                  <FooterIconSlotButton
                    icon={<span aria-hidden="true">⚡</span>}
                    label="Lightning suggestion"
                    onClick={() => {
                      void emitWithAck("lobby:hatSuggestClue", { clueIndex: index });
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ImposterLobbyCard({
  lobby,
  isHost,
  emitWithAck,
}: {
  readonly lobby: LobbyDto;
  readonly isHost: boolean;
  readonly emitWithAck: (
    event: string,
    body?: unknown,
  ) => Promise<{ ok?: boolean; error?: string } | undefined>;
}) {
  const playerCount = lobby.players.length;
  const maxImposters = maxImpostersForPlayers(playerCount);
  const options = Array.from({ length: maxImposters }, (_, index) => index + 1);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-typ-card-title font-semibold">Imposter setup</p>
      <p className="mt-1 text-typ-ui-snug text-muted-foreground">
        Everyone in this room plays ({playerCount}{" "}
        {playerCount === 1 ? "player" : "players"}). At least 4 players are required to
        start.
      </p>
      {isHost ? (
        <>
          <label className="mt-4 block text-typ-ui font-medium" htmlFor="imposter-count">
            Number of imposters
          </label>
          <select
            className="mt-2 w-full max-w-xs rounded-xl border border-input bg-background px-3 py-2 text-typ-ui"
            id="imposter-count"
            value={lobby.imposterImposterCount}
            onChange={(event) => {
              void emitWithAck("lobby:hostPatchImposterCounts", {
                imposterImposterCount: Number(event.target.value),
              });
            }}
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {playerCount < 6 ? (
            <p className="mt-2 text-typ-ui-snug text-muted-foreground">
              With fewer than six players, only one imposter is allowed.
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-4 text-typ-ui text-muted-foreground">
          Imposters this round:{" "}
          <span className="font-semibold text-foreground">{lobby.imposterImposterCount}</span>
        </p>
      )}
    </section>
  );
}

export function RoomPage() {
  const navigate = useNavigate();
  const params = useParams();
  const code = params.code?.toUpperCase();
  const { sync, bindError, emitWithAck, connected, shuttingDown } = useRoomChannel(
    code,
    Boolean(code),
  );
  const playingBookmarkCommittedRef = useRef(false);

  useEffect(() => {
    if (!sync) {
      return undefined;
    }

    if (sync.phase === "lobby" || sync.phase === "ended") {
      playingBookmarkCommittedRef.current = false;
      clearActiveGameBookmark();

      return undefined;
    }

    if (sync.phase === "playing" && !playingBookmarkCommittedRef.current) {
      playingBookmarkCommittedRef.current = true;
      writeActiveGameBookmark({
        code: sync.code,
        gameKind: sync.gameKind,
        startedAtIso: new Date().toISOString(),
      });
    }

    return undefined;
  }, [sync]);
  const [startError, setStartError] = useState<string | null>(null);
  const [qrToastOpen, setQrToastOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const copyToastTimer = useRef<number | null>(null);

  const joinLink = useMemo(() => (code ? shareUrl(code) : ""), [code]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinLink);
      setCopiedToast(true);

      if (copyToastTimer.current) {
        window.clearTimeout(copyToastTimer.current);
      }

      copyToastTimer.current = window.setTimeout(() => {
        setCopiedToast(false);
      }, 2200);
    } catch {
      setStartError("Clipboard blocked — copy manually.");
    }
  };

  const handleStartGame = async () => {
    setStartError(null);
    const ack = await emitWithAck("lobby:startGame");

    if (ack?.ok === false) {
      setStartError(ack.error ?? "Unable to start yet.");
    }
  };

  useEffect(() => {
    return () => {
      if (copyToastTimer.current) {
        window.clearTimeout(copyToastTimer.current);
      }
    };
  }, []);

  // Delay the "Reconnecting..." banner so a transient blip during a real
  // navigation/hot-reload does not flash a misleading status. Two seconds
  // matches the eye's threshold for "this is taking a while" without being
  // long enough to hide a real outage.
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  useEffect(() => {
    if (connected) {
      setShowOfflineBanner(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setShowOfflineBanner(true);
    }, 2000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [connected]);

  // Banner priority: bindError (fatal — full screen elsewhere) > shutdown
  // (server is about to disconnect) > offline (transient drop). bindError
  // doesn't render here because the `if (bindError)` branch below renders its
  // own full-page screen with the same message — shutdown/offline still get
  // wrapped by `wrapWithBanners`.
  const shutdownBanner = shuttingDown ? (
    <div
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 bg-primary px-4 py-2 text-center text-typ-ui text-primary-foreground shadow-md"
      role="status"
    >
      The server is restarting — keep this tab open, the room will reopen in a moment.
    </div>
  ) : null;

  const offlineBanner =
    !shuttingDown && showOfflineBanner ? (
      <div
        aria-live="polite"
        className="fixed inset-x-0 top-0 z-50 bg-muted px-4 py-2 text-center text-typ-ui text-muted-foreground shadow-md"
        role="status"
      >
        Reconnecting…
      </div>
    ) : null;

  const wrapWithBanners = (body: React.ReactNode) => (
    <>
      {shutdownBanner}
      {offlineBanner}
      {body}
    </>
  );

  if (!code) {
    return wrapWithBanners(
      <GameShell footer={null} title="Room">
        <p className="text-typ-body-relaxed text-muted-foreground">Missing room code.</p>
      </GameShell>,
    );
  }

  if (bindError) {
    return wrapWithBanners(
      <GameShell
        footer={
          <PrimaryFooterButton label="Back to home" onClick={() => navigate("/")} />
        }
        title="Reconnect"
      >
        <p className="text-typ-body-relaxed text-destructive">{bindError}</p>
        <p className="mt-2 text-typ-ui text-muted-foreground">
          If you just left, ask the host for the code and join again with the same display name if the room is still in the lobby.
        </p>
      </GameShell>
    );
  }

  if (!sync) {
    return wrapWithBanners(
      <GameShell footer={null} title="Connecting">
        <p className="text-typ-body-relaxed text-muted-foreground">
          {connected ? "Syncing your table..." : "Connecting to the host..."}
        </p>
      </GameShell>,
    );
  }

  if (sync.phase === "playing" && sync.gameKind === "hat" && sync.hat) {
    return wrapWithBanners(
      <HatMultiplayerView
        emitWithAck={emitWithAck}
        isHost={sync.you.isHost}
        payload={sync.hat}
        replaySync={sync.replay}
        viewerPlayerId={sync.you.playerId}
      />,
    );
  }

  if (sync.phase === "playing" && sync.gameKind === "imposter" && sync.imposter) {
    return wrapWithBanners(
      <ImposterMultiplayerView
        emitWithAck={emitWithAck}
        isHost={sync.you.isHost}
        payload={sync.imposter}
        replaySync={sync.replay}
        viewerPlayerId={sync.you.playerId}
      />,
    );
  }

  if (sync.phase === "playing" && sync.gameKind === "whowhatwhere" && sync.www) {
    return wrapWithBanners(
      <WhoWhatWhereMultiplayerView
        emitWithAck={emitWithAck}
        isHost={sync.you.isHost}
        payload={sync.www}
        replaySync={sync.replay}
        viewerPlayerId={sync.you.playerId}
      />,
    );
  }

  if (sync.phase === "ended") {
    return wrapWithBanners(
      <GameShell
        footer={
          <PrimaryFooterButton label="Back to home" onClick={() => navigate("/")} />
        }
        title="Table closed"
      >
        <p className="text-typ-body-relaxed text-muted-foreground">
          This room is finished — everyone left from the score screen or the match was
          cleared. You can host or join a new game from the home page.
        </p>
      </GameShell>,
    );
  }

  if (sync.phase === "lobby" && sync.lobby) {
    const lobby = sync.lobby;
    const isHost = sync.you.isHost;
    const myId = sync.you.playerId;
    const isTeamGame = sync.gameKind === "whowhatwhere" || sync.gameKind === "hat";

    return (
      <>
        {shutdownBanner}
        {offlineBanner}
        <GameShell
          footer={
            isHost ? (
              <div className="flex w-full flex-col gap-2">
                <SecondaryFooterButton
                  label="Start game (everyone must ready up)"
                  onClick={() => {
                    void handleStartGame();
                  }}
                />
              </div>
            ) : (
              <PlayerReadyBar
                emitWithAck={emitWithAck}
                ready={
                  lobby.players.find((player) => player.id === myId)?.ready ?? false
                }
              />
            )
          }
          title="Lobby"
        >
          <div className="flex flex-col gap-4 pb-6">
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-typ-overline text-primary">Share code</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="font-mono text-typ-display font-bold tracking-[0.25em]">
                  {sync.code}
                </span>
                <span className="flex items-center gap-2">
                  <Button
                    aria-label="Copy invite link"
                    size="icon"
                    variant="outline"
                    onClick={() => void handleCopyLink()}
                  >
                    <IconClipboard className="size-5" />
                  </Button>
                  <Button
                    aria-label="Show QR code"
                    size="icon"
                    variant="outline"
                    onClick={() => setQrToastOpen(true)}
                  >
                    <IconQrCode className="size-5" />
                  </Button>
                </span>
              </div>
              <p className="mt-2 text-typ-ui-snug text-muted-foreground">
                Connection: {connected ? "live" : "reconnecting..."}
              </p>
            </section>

            {copiedToast ? (
              <div
                className="fixed bottom-24 left-1/2 z-40 max-w-sm -translate-x-1/2 rounded-xl border border-border bg-card px-4 py-3 text-typ-ui shadow-lg"
                role="status"
              >
                Link copied to clipboard
              </div>
            ) : null}

            {isTeamGame ? (
              <LobbyTeamsSection
                emitWithAck={emitWithAck}
                isHost={isHost}
                lobby={lobby}
                myPlayerId={myId}
              />
            ) : (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="text-typ-card-title font-semibold">Players</p>
                <ul className="mt-3 space-y-2 text-typ-ui">
                  {lobby.players.map((player) => (
                    <li className="flex items-center gap-2" key={player.id}>
                      {player.ready ? (
                        <IconCheck aria-hidden className="size-4 shrink-0 text-emerald-600" />
                      ) : (
                        <span aria-hidden className="inline-block size-4 shrink-0" />
                      )}
                      <span>
                        {player.name}
                        {player.isHost ? (
                          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-typ-ui text-muted-foreground">
                            Host
                          </span>
                        ) : null}
                        {player.disconnectedAt ? (
                          <span className="ml-2 text-destructive">Away</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {sync.gameKind === "hat" ? (
              <HatLobbyFamousFiguresSection
                clueSlots={GAME_DEFAULTS.cluesPerPlayer}
                drafts={lobby.hatClueDrafts[myId] ?? []}
                emitWithAck={emitWithAck}
              />
            ) : null}

            {sync.gameKind === "imposter" ? (
              <ImposterLobbyCard emitWithAck={emitWithAck} isHost={isHost} lobby={lobby} />
            ) : null}

            {sync.gameKind === "whowhatwhere" && isHost ? (
              <details className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <summary className="cursor-pointer text-typ-card-title font-semibold">
                  Who What Where settings
                </summary>
                <div className="mt-4">
                  <SettingsScreen
                    embedded
                    settings={lobby.wwwSettings}
                    onChange={(next) => {
                      void emitWithAck("lobby:hostPatchWhoWhatWhereSettings", { patch: next });
                    }}
                  />
                </div>
              </details>
            ) : null}

            {sync.gameKind === "hat" && isHost ? (
              <details className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <summary className="cursor-pointer text-typ-card-title font-semibold">
                  Number of teams
                </summary>
                <div className="mt-4">
                  <TeamCountOptionGroup
                    value={lobby.teamCount as SharedTeamCount}
                    onChange={(count) => {
                      void emitWithAck("lobby:hostSetTeamCount", { teamCount: count });
                    }}
                  />
                </div>
              </details>
            ) : null}

            {startError ? (
              <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-typ-ui text-destructive">
                {startError}
              </p>
            ) : null}
          </div>
        </GameShell>

        {qrToastOpen ? (
          <div
            className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 px-4 py-8"
            role="dialog"
            onClick={() => setQrToastOpen(false)}
          >
            <div
              className="w-full max-w-sm cursor-default rounded-2xl border border-border bg-card p-5 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-typ-card-title font-semibold">Scan to join</p>
                <Button
                  aria-label="Close"
                  size="icon"
                  variant="ghost"
                  onClick={() => setQrToastOpen(false)}
                >
                  <IconX className="size-5" />
                </Button>
              </div>
              <p className="mt-1 text-typ-ui-snug text-muted-foreground">
                Opens the name screen with this room code filled in.
              </p>
              <div className="mt-4 flex justify-center rounded-xl bg-white p-4">
                <QRCode size={200} value={joinLink} />
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return wrapWithBanners(
    <GameShell footer={null} title="Room">
      <p className="text-typ-ui text-muted-foreground">Waiting for host instructions...</p>
    </GameShell>,
  );
}

function LobbyTeamsSection({
  lobby,
  myPlayerId,
  isHost,
  emitWithAck,
}: {
  readonly lobby: LobbyDto;
  readonly myPlayerId: string;
  readonly isHost: boolean;
  readonly emitWithAck: (
    event: string,
    body?: unknown,
  ) => Promise<{ ok?: boolean; error?: string } | undefined>;
}) {
  const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  /** Host-only: which player is being assigned via the move-team dialog. */
  const [hostMoveTarget, setHostMoveTarget] = useState<LobbyPlayerDto | null>(null);
  const [hostMoveTeamPick, setHostMoveTeamPick] = useState(0);

  const myTeamIndex = lobby.players.find((p) => p.id === myPlayerId)?.teamIndex ?? 0;

  const openEdit = (teamIndex: number) => {
    setEditingTeamIndex(teamIndex);
    setEditDraft(lobby.teamNames[teamIndex] ?? `Team ${teamIndex + 1}`);
  };

  const submitRename = async (event: FormEvent) => {
    event.preventDefault();

    if (editingTeamIndex === null) {
      return;
    }

    const trimmed = editDraft.trim().slice(0, 24);

    if (isHost) {
      await emitWithAck("lobby:hostSetTeamName", {
        teamIndex: editingTeamIndex,
        name: trimmed,
      });
    } else {
      await emitWithAck("lobby:captainSetTeamName", {
        teamIndex: editingTeamIndex,
        name: trimmed,
      });
    }

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
      {Array.from({ length: lobby.teamCount }).map((_, teamIndex) => {
        const captainId = captainPlayerIdForTeam(lobby, teamIndex);
        const displayName = lobby.teamNames[teamIndex] ?? `Team ${teamIndex + 1}`;
        const canRename =
          isHost || (captainId !== undefined && captainId === myPlayerId);
        const showJoinArrow = myTeamIndex !== teamIndex;

        return (
          <section
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            key={teamIndex}
          >
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
              <div className="min-w-0 flex-1">
                {editingTeamIndex === teamIndex ? (
                  <form className="flex flex-wrap items-center gap-2" onSubmit={submitRename}>
                    <input
                      autoFocus
                      className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2 py-1 text-typ-ui"
                      maxLength={24}
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                    />
                    <Button size="sm" type="submit" variant="default">
                      Save
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="ghost"
                      onClick={() => setEditingTeamIndex(null)}
                    >
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="truncate text-typ-card-title font-semibold">{displayName}</p>
                    {canRename ? (
                      <button
                        aria-label={`Rename ${displayName}`}
                        className="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        type="button"
                        onClick={() => openEdit(teamIndex)}
                      >
                        <IconPencil className="size-4" />
                      </button>
                    ) : null}
                  </div>
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
                      isHost
                        ? { playerId: myPlayerId, teamIndex }
                        : { teamIndex },
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
            <ul className="divide-y divide-border px-3 py-1">
              {lobby.players
                .filter((player) => (player.teamIndex ?? 0) === teamIndex)
                .map((player) => (
                  <li
                    className="flex items-center gap-2 py-2 text-typ-ui"
                    key={player.id}
                  >
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
                      {player.disconnectedAt ? (
                        <span className="ml-2 text-destructive">Away</span>
                      ) : null}
                    </span>
                    {isHost ? (
                      <button
                        aria-label={`Choose team for ${player.name}`}
                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        type="button"
                        onClick={() => openHostMovePlayer(player)}
                      >
                        <IconArrowLeftRight className="size-4" />
                      </button>
                    ) : null}
                  </li>
                ))}
              {lobby.players.filter((p) => (p.teamIndex ?? 0) === teamIndex).length === 0 ? (
                <li className="py-3 text-typ-ui text-muted-foreground">No players yet</li>
              ) : null}
            </ul>
          </section>
        );
      })}
      </div>

      {hostMoveTarget ? (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 px-4 py-8"
          role="dialog"
          onClick={closeHostMovePlayer}
        >
          <div
            className="w-full max-w-md cursor-default rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-typ-card-title font-semibold leading-snug">
              What team do you want to move {hostMoveTarget.name} to?
            </p>
            <label className="mt-4 block text-typ-ui font-medium" htmlFor="host-move-team">
              Team
            </label>
            <select
              className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-typ-ui"
              id="host-move-team"
              value={hostMoveTeamPick}
              onChange={(event) => setHostMoveTeamPick(Number(event.target.value))}
            >
              {Array.from({ length: lobby.teamCount }).map((_, idx) => {
                const label = lobby.teamNames[idx] ?? `Team ${idx + 1}`;

                return (
                  <option key={idx} value={idx}>
                    {label}
                  </option>
                );
              })}
            </select>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeHostMovePlayer}>
                Cancel
              </Button>
              <Button type="button" onClick={confirmHostMovePlayer}>
                Move
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PlayerReadyBar({
  ready,
  emitWithAck,
}: {
  readonly ready: boolean;
  readonly emitWithAck: (
    event: string,
    body?: unknown,
  ) => Promise<{ ok?: boolean; error?: string } | undefined>;
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
