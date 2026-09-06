import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ModalDialog } from "@/components/ModalDialog";
import { Button } from "@/components/ui/button";
import type { EmitWithAck, SocketRequestArgs } from "@/domain/multiplayer/protocol";
import type { RoomSyncPayload } from "@/domain/multiplayer/protocol";
import { clearActiveGameBookmark, readActiveGameBookmark } from "@/multiplayer/activeGameBookmark";
import { clearSession } from "@/multiplayer/useRoomChannel";

type Confirmation = {
  request: SocketRequestArgs;
  title: string;
  detail: string;
  leave?: boolean;
};

export function RoomOptions({
  sync,
  connected,
  emitWithAck,
}: {
  readonly sync: RoomSyncPayload;
  readonly connected: boolean;
  readonly emitWithAck: EmitWithAck;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const awayPlayers =
    sync.lobby?.players.filter((player) => !player.isHost && player.disconnectedAt !== null) ?? [];

  const confirm = async () => {
    if (!confirmation || busy) return;
    setBusy(true);
    setError("");
    try {
      const ack = await emitWithAck(...confirmation.request);
      if (!ack?.ok) {
        setError(ack?.error ?? "The change was not confirmed. Try again.");
        return;
      }
      if (confirmation.leave) {
        clearSession(sync.code);
        if (readActiveGameBookmark()?.code === sync.code) clearActiveGameBookmark();
        navigate("/");
      }
      setOpen(false);
      setConfirmation(null);
    } catch {
      setError("The change was not confirmed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        aria-label="Room options"
        onClick={() => {
          setConfirmation(null);
          setError("");
          setOpen(true);
        }}
      >
        Room
      </Button>
      {open ? (
        <ModalDialog title={confirmation?.title ?? "Room options"} onClose={() => setOpen(false)}>
          {confirmation ? (
            <>
              <p className="my-4 text-typ-ui text-muted-foreground">{confirmation.detail}</p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirmation(null)}
                >
                  Cancel
                </Button>
                <Button type="button" disabled={busy || !connected} onClick={() => void confirm()}>
                  {busy ? "Working…" : "Confirm"}
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-4 space-y-4">
              {sync.phase === "lobby" ? (
                <>
                  {sync.you.isHost ? (
                    <section>
                      <h3 className="font-semibold">Away players</h3>
                      <p className="my-2 text-typ-ui text-muted-foreground">
                        A new join creates a new seat. Remove an abandoned seat before inviting a
                        replacement.
                      </p>
                      {awayPlayers.length ? (
                        <ul className="space-y-2">
                          {awayPlayers.map((player) => (
                            <li key={player.id} className="flex items-center justify-between gap-2">
                              <span>{player.name}</span>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={!connected}
                                onClick={() =>
                                  setConfirmation({
                                    request: ["lobby:hostRemovePlayer", { playerId: player.id }],
                                    title: `Remove ${player.name}?`,
                                    detail:
                                      "This removes their seat and submitted lobby clues. Their old tab will no longer be able to resume. Connected players cannot be removed.",
                                  })
                                }
                              >
                                Remove {player.name}
                              </Button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-typ-ui text-muted-foreground">No away players.</p>
                      )}
                    </section>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!connected}
                    onClick={() =>
                      setConfirmation(
                        sync.you.isHost
                          ? {
                              request: ["lobby:hostClose"],
                              title: "Close this lobby?",
                              detail:
                                "Everyone will leave this table. You can host a new room from the home page.",
                              leave: true,
                            }
                          : {
                              request: ["lobby:leave"],
                              title: "Leave this lobby?",
                              detail:
                                "Your seat and lobby clues will be removed, including in any other tab using this seat. You can join again as a new player.",
                              leave: true,
                            },
                      )
                    }
                  >
                    {sync.you.isHost ? "Close lobby" : "Leave lobby"}
                  </Button>
                </>
              ) : sync.you.isHost ? (
                <>
                  <p className="text-typ-ui text-muted-foreground">
                    If someone cannot reconnect, return everyone to the lobby, remove their away
                    seat, and start again.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!connected}
                    onClick={() =>
                      setConfirmation({
                        request: ["room:hostReturnToLobby"],
                        title: "End this match and return to lobby?",
                        detail:
                          "Current scores, turns, and drawings will be cleared. Players, teams, settings, and Hat lobby clues stay available. Everyone must ready up again.",
                      })
                    }
                  >
                    Return room to lobby
                  </Button>
                </>
              ) : null}
            </div>
          )}
          {error ? (
            <p role="alert" className="mt-3 text-typ-ui text-destructive">
              {error}
            </p>
          ) : null}
        </ModalDialog>
      ) : null}
    </>
  );
}
